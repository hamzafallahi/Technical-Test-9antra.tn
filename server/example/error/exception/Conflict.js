class ConflictError extends Error {
    constructor(message, module) {
        super(message);
        this.name = "Conflict";
        this.statusCode = 409;
        this.module = module;
    }
}
module.exports = ConflictError;