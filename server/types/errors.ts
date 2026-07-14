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

// A WorkspaceTree invariant was violated (VFS_DESIGN.md §5/§6) — a data/generation
// bug, not a client input problem. Not the client's fault, so it is not a 4xx.
export class WorkspaceIntegrityError extends AppError {
  readonly statusCode = 500;
}
