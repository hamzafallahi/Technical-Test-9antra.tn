class NotFoundError extends Error {
  constructor(message, module = null) {
    super(message);
    this.statusCode = 404;
    this.module = module;
    this.name = "NotFoundError";
  }
}

export default NotFoundError;
