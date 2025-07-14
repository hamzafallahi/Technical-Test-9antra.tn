import BusinessError from "../error/BusinessError.js";

const validateMiddleware = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const businessError = new BusinessError(
        400,
        "VALIDATION_ERROR",
        "Bad Request"
      );

      error.details.forEach((detail) => {
        const field = detail.path[detail.path.length - 1];
        businessError.addError(field, detail.message);
      });

      return next(businessError);
    }
    next();
  };
};

export default validateMiddleware;
