export abstract class AppError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
}

export class BadGatewayError extends AppError {
  readonly statusCode = 502;
}
