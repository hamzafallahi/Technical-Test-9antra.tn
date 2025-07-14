import NotFoundError from "../exception/NotFound.js";
import ConflictError from "../exception/Conflict.js";
import TechnicalError from "../TechnicalError.js";
import BusinessError from "../BusinessError.js";

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  if (err instanceof BusinessError) {
    return res.status(err.statusCode || 400).json({
      errors: err.errors,
    });
  }

  if (err.statusCode === 400) {
    const businessErrorResponse = new BusinessError(
      err.statusCode,
      "BAD_REQUEST",
      "Bad Request"
    );
    if (Array.isArray(err.details)) {
      err.details.forEach((detail) => {
        businessErrorResponse.addError(
          detail.path[detail.path.length - 1],
          detail.message
        );
      });
    }
    return res.status(400).json({
      errors: businessErrorResponse.errors,
    });
  } else if (err instanceof NotFoundError) {
    const error = {
      status: "404",
      title: "Not Found",
      detail: err.message,
      source: {
        pointer: `/data/${err.module ? `attributes/${err.module}` : "id"}`,
      },
    };
    return res.status(404).json({ errors: [error] });
  } else if (err instanceof ConflictError) {
    const error = {
      status: "409",
      title: "Conflict",
      detail: err.message,
      source: {
        pointer: `/data/attributes/${err.module || "id"}`,
      },
    };
    return res.status(409).json({ errors: [error] });
  } else {
    const error = {
      status: err.statusCode ? err.statusCode.toString() : "500",
      title: "Internal Server Error",
      detail:
        err.message ||
        "An unexpected error occurred on the server. Please try again later.",
    };
    
    if (process.env.NODE_ENV === "development") {
      error.meta = {
        stack: err.stack,
      };
    }
    
    return res.status(500).json({ errors: [error] });
  }
};

export { errorHandler };
