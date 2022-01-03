// With inspiration from:
// https://medium.com/@SigniorGratiano/express-error-handling-674bfdd86139

/**
 * A custom error type with a status code property.
 */
export default class ErrorResponse extends Error {
  statusCode: number;
  detail: string;

  constructor(
    name: string,
    statusCode: number,
    message: string,
    detail?: string
  ) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;

    this.message = message;
    this.detail = detail ?? "No further details";

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ErrorResponse.prototype);
  }
}
