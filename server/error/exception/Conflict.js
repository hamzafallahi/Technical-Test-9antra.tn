class ConflictError extends Error {
  constructor(message, module = null) {
    super(message);
    this.statusCode = 409;
    this.module = module;
    this.name = "ConflictError";
  }
}

export default ConflictError;
