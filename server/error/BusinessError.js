class BusinessError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = [];
    this.name = "BusinessError";
  }

  addError(field, message) {
    this.errors.push({
      status: this.statusCode.toString(),
      title: this.code,
      detail: message,
      source: {
        pointer: `/data/attributes/${field}`,
      },
    });
  }
}

export default BusinessError;
