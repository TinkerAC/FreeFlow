/**
 * 统一的应用错误模型。
 * 业务层和基础设施层只需要描述错误语义，HTTP 层再统一决定状态码和响应结构。
 */
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

/**
 * 将未知异常收敛成应用错误，避免错误处理中间件和路由层到处写重复判断。
 */
export function toAppError(error: unknown) {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(500, error.message, 'UNEXPECTED_ERROR');
  }
  return new AppError(500, 'Unexpected error', 'UNEXPECTED_ERROR');
}
