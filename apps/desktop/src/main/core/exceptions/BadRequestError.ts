/**
 * 处理参数缺失时抛出的错误
 */
export class BadRequestError extends Error {
  public readonly status: number;

  constructor(message: string) {
    super(message);
    this.status = 400;
  }
}
