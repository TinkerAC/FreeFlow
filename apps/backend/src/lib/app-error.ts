export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, code = 'APP_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function toAppError(error: unknown) {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(500, error.message, 'UNEXPECTED_ERROR');
  }
  return new AppError(500, 'Unexpected error', 'UNEXPECTED_ERROR');
}
