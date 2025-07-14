class TechnicalError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "TechnicalError";
  }
}

export default TechnicalError;
