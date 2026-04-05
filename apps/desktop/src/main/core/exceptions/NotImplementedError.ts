/**
 * 表示某个方法/功能尚未实现
 */
export class NotImplementedError extends Error {
  constructor(message = '方法未实现') {
    super(message);
    this.name = 'NotImplementedError';
    // 修复 prototype 链，让 instanceof 生效
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}