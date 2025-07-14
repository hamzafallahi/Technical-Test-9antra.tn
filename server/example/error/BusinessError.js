class BusinessError extends Error {
  constructor(statusCode, code, title) {
    super(title);
    this.name = "BusinessError";
    this.statusCode = statusCode;
    this.code = code;
    this.title = title;
    this.errors = [];
  }

  addError(field, detail) {
    this.errors.push({
      status: this.statusCode.toString(),
      title: this.title,
      detail: detail,
      source: {
        pointer:
          field === "data"
            ? "/data/"
            : field === "type"
            ? "/data/type/"
            : field === "attributes"
            ? "/data/attributes/"
            : field === "body"
            ? "/body/"
            : `/data/attributes/${field}`,
      },
    });
  }
}

module.exports = BusinessError;
