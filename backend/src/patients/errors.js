export class ValidationError extends Error {
  /**
   * @param {string} message
   * @param {Record<string, unknown>} [details]
   */
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

export class ConflictError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}
