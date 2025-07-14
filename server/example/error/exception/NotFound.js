class NotFoundError extends Error {
  constructor(message, module) {
    super(message);
    this.name = "NotFound";
    this.statusCode = 404;
    this.module = module;
  }
}
module.exports = NotFoundError;
