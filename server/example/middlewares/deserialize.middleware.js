const BusinessError = require("../error/BusinessError");

const deserializeMiddleware = (deserializer) => {
  return async (req, res, next) => {
    try {
      if (!req.body.data) {
        const error = new BusinessError(400, "INVALID_FORMAT", "Bad Request");
        error.addError(
          "data",
          "Request body must include data object following JSON:API 1.1"
        );
        return next(error);
      }

      if (!req.body.data.type) {
        const error = new BusinessError(400, "INVALID_FORMAT", "Bad Request");
        error.addError(
          "type",
          "Request body must include Type following JSON:API 1.1"
        );
        return next(error);
      }

      if (!req.body.data.attributes) {
        const error = new BusinessError(400, "INVALID_FORMAT", "Bad Request");
        error.addError(
          "attributes",
          "Request body must include attributes object following JSON:API 1.1"
        );
        return next(error);
      }
      //console.log(error);
      const deserializedData = await deserializer.deserialize(req);
      console.log(
        "Deserialized Data:",
        JSON.stringify(deserializedData, null, 2)
      );
      req.body = deserializedData;
      next();
    } catch (error) {
      const businessError = new BusinessError(
        400,
        "INVALID_FORMAT",
        "Bad Request"
      );
      businessError.addError("body", "Invalid JSON:API format");
      next(businessError);
    }
  };
};

module.exports = deserializeMiddleware;
