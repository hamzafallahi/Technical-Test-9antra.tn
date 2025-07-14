const redisClient = require("../utils/redisClient");

const CACHE_PREFIX = "ms-calendars:";
const CACHE_TTL = 3600;

const urlUtils = {
    // Normalize URLs - remove trailing slashes and handle query parameters
    normalizeUrl(url) {
        let urlPath = url;
        let queryParams = '';
        
        // Split URL and query parameters
        if (url.includes('?')) {
            const parts = url.split('?');
            urlPath = parts[0];
            queryParams = '?' + parts[1];
        }
        
        // Remove trailing slash if present
        if (urlPath.length > 1 && urlPath.endsWith('/')) {
            urlPath = urlPath.slice(0, -1);
        }
        
        return urlPath + queryParams;
    },

    // Extract the first UUID found in a URL
    extractFirstUuid(url) {
        const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const match = url.match(uuidPattern);
        return match ? match[0] : null;
    },

    // Create a cache key from URL
    createCacheKey(url) {
        const normalizedUrl = this.normalizeUrl(url);
        return `${CACHE_PREFIX}${normalizedUrl}`;
    },

    // Create a base cache key from URL (first 4 segments)
    createBaseKey(url) {
        const normalizedUrl = this.normalizeUrl(url);
        return `${CACHE_PREFIX}${normalizedUrl.split("/", 4).join("/")}`;
    }
};

/**
 * Cache Operations
 */
const cacheOps = {
    // Scan and delete all keys containing a specific UUID
    async invalidateByUuid(uuid) {
        if (!uuid) return;
        
        let cursor = "0";
        let deletedCount = 0;

        do {
            const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", `${CACHE_PREFIX}*`, "COUNT", 100);
            cursor = nextCursor;

            const keysWithUuid = keys.filter((key) => key.includes(uuid));

            if (keysWithUuid.length > 0) {
                await redisClient.del(...keysWithUuid);
                deletedCount += keysWithUuid.length;
                console.log(`Deleted UUID-related cache keys: ${keysWithUuid.join(", ")}`);
            }
        } while (cursor !== "0");
        
        if (deletedCount > 0) {
            console.log(`Total ${deletedCount} cache keys containing UUID ${uuid} were deleted`);
        }
    },

    // Delete keys with query strings based on a base key
    async invalidateQueryKeys(cacheKey) {
        let cursor = "0";

        do {
            const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", `${cacheKey}*`, "COUNT", 100);
            cursor = nextCursor;

            const keysWithQuery = keys.filter((key) => key.startsWith(cacheKey + "?"));

            if (keysWithQuery.length > 0) {
                await redisClient.del(...keysWithQuery);
                console.log(`Deleted query-string cache keys: ${keysWithQuery.join(", ")}`);
            }
        } while (cursor !== "0");
    },

    // Store a value in cache
    async set(key, value) {
        try {
            await redisClient.set(key, JSON.stringify(value), "EX", CACHE_TTL);
            console.log(`Cached response for ${key}`);
        } catch (err) {
            console.error("Error caching response:", err);
        }
    },

    // Get a value from cache
    async get(key) {
        try {
            const value = await redisClient.get(key);
            return value ? JSON.parse(value) : null;
        } catch (err) {
            console.error(`Error retrieving cache for ${key}:`, err);
            return null;
        }
    },

    // Delete a specific key
    async delete(key) {
        try {
            await redisClient.del(key);
            console.log(`Deleted cache for ${key}`);
        } catch (err) {
            console.error(`Error deleting cache for ${key}:`, err);
        }
    }
};

/**
 * Handle cache invalidation for write operations (DELETE, PUT, PATCH, POST)
 */
async function invalidateCache(req) {
    const cacheKey = urlUtils.createCacheKey(req.originalUrl);
    const baseKey = urlUtils.createBaseKey(req.originalUrl);

    console.log("Cache invalidation for method:", req.method);
    
    // Delete direct keys
    await cacheOps.delete(cacheKey);
    await cacheOps.delete(baseKey);
    
    // Handle UUID-based invalidation
    const uuid = urlUtils.extractFirstUuid(req.originalUrl);
    if (uuid) {
        console.log(`Found UUID in request URL: ${uuid}, clearing related cache keys`);
        await cacheOps.invalidateByUuid(uuid);
    }
  
    // Clear query-based keys
    await cacheOps.invalidateQueryKeys(baseKey);
    await cacheOps.invalidateQueryKeys(cacheKey);
}

/**
 * Handle response caching for GET operations
 */
function handleCachingResponse(res, cacheKey) {
    let sendCalled = false;
    const originalSend = res.send;
    
    res.send = function(body) {
        if (!sendCalled) {
            sendCalled = true;
            
            // Only cache successful responses (status code < 400)
            const statusCode = res.statusCode;
            if (statusCode < 400) {
                console.log(`Caching response with status code ${statusCode} for ${cacheKey}`);
                cacheOps.set(cacheKey, body);
            } else {
                console.log(`Not caching error response with status code ${statusCode} for ${cacheKey}`);
            }
        }
        originalSend.call(this, body);
    };
}

/**
 * Main Cache Middleware
 */
async function cacheMiddleware(req, res, next) {
    // Skip if Redis is not ready
    if (redisClient.status !== "ready") {
        return next();
    }
    
    console.log("Processing request:", req.baseUrl + req.path);
    const cacheKey = urlUtils.createCacheKey(req.originalUrl);

    try {
        // Handle cache invalidation for write operations
        if (req.method !== "GET") {
            await invalidateCache(req);
            return next();
        }
        
        // Handle GET requests - try to serve from cache first
        const cachedResponse = await cacheOps.get(cacheKey);
        
        if (cachedResponse) {
            // Cache hit: return the cached response
            console.log(`Cache hit for ${cacheKey}`);
            return res.send(cachedResponse);
        } else {
            // Cache miss: proceed to fetch data and cache the response
            console.log(`Cache miss for ${cacheKey}`);
            handleCachingResponse(res, cacheKey);
            next();
        }
    } catch (error) {
        console.error("Cache middleware error:", error);
        // Proceed without caching in case of error
        next();
    }
}

module.exports = cacheMiddleware;