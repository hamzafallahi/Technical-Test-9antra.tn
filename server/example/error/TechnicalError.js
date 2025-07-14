class TechnicalError {
  constructor(status, code, title = "Internal Server Error") {
    this.status = status.toString();
    this.code = code;
    this.title = title;
    this.detail = null;
    this.source = null;
  }

  setDetail(detail) {
    this.detail = detail;
    return this;
  }

  setSource(pointer) {
    if (pointer) {
      this.source = {
        pointer: pointer
      };
    }
    return this;
  }
}

module.exports = TechnicalError;
