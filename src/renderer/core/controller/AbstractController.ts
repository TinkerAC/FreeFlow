// file: src/renderer/core/AbstractController.ts (或者你认为合适的路径)

/**
 * 取消订阅函数的类型定义。
 */
export type UnsubscribeFunction = () => void;

/**
 * 抽象控制器基类，提供订阅/通知机制。
 * @template TSubscriberArgs 一个元组类型，表示传递给订阅者回调函数的参数类型列表。
 */
export abstract class AbstractController<TSubscriberArgs extends any[]> {
  protected subscribers: ((...args: TSubscriberArgs) => void)[] = [];

  constructor() {
    // 可以在这里进行所有控制器共有的初始化（如果需要）
  }

  /**
   * 获取当前应传递给订阅者的状态参数。
   * 具体子类必须实现此方法，以提供它们特定的状态。
   */
  protected abstract getCurrentStateForSubscriber(): TSubscriberArgs;

  /**
   * 订阅状态变更。
   * 新的订阅者会立即以当前状态被调用一次。
   * @param fn 订阅者回调函数。
   * @returns 一个用于取消订阅的函数。
   */
  public subscribe(fn: (...args: TSubscriberArgs) => void): UnsubscribeFunction {
    if (typeof fn !== 'function') {
      console.warn('AbstractController: 尝试使用非函数对象进行订阅:', fn);
      return () => {
      }; // 返回一个空操作的取消订阅函数
    }
    this.subscribers.push(fn);

    // 立即用当前状态通知新的订阅者
    try {
      fn(...this.getCurrentStateForSubscriber());
    } catch (error) {
      console.error('AbstractController: 立即通知新订阅者时出错:', error, 'Subscriber:', fn);
    }

    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn);
    };
  }

  /**
   * 用当前状态通知所有订阅者。
   * 当相关状态发生变化时，具体子类应该调用此方法。
   */
  protected notify(): void {
    const currentStateArgs = this.getCurrentStateForSubscriber();
    // 使用 [...this.subscribers] 创建一个副本进行迭代，
    // 以防止在通知期间有订阅者被移除导致的问题。
    [...this.subscribers].forEach(fn => {
      try {
        fn(...currentStateArgs);
      } catch (error) {
        console.error('AbstractController: 通知订阅者时出错:', error, 'Subscriber:', fn);
      }
    });
  }

  /**
   * 清理控制器的资源，主要是清空订阅者列表。
   * 具体子类应重写此方法以执行额外的清理操作（例如移除事件监听器），
   * 然后调用 super.dispose()。
   */
  public dispose(): void {
    this.subscribers = [];
    // console.log('AbstractController disposed: subscribers cleared.');
  }
}