// file: src/renderer/navigation/MainContentViewStack.ts

export enum ViewName {
  PLAY_LIST = 'playlist',
  SEARCH_RESULTS = 'searchResults',
  PROFILE = 'profile',
  LYRIC = 'lyric',
}

export interface StackItem {
  view: ViewName;
}

export type ViewChangeListener = (stack: StackItem[], pointer: number) => void;

/**
 * 全局视图栈管理器：维护 stack 和 pointer，
 * 并支持 subscribe/notify，前进、后退、导航新视图。
 */
export class MainContentViewStack {
  private stack: StackItem[];
  private pointer: number;
  private listeners: ViewChangeListener[] = [];

  constructor(initial: StackItem) {
    this.stack = [initial];
    this.pointer = 0;
  }

  /** 获取当前整个栈 */
  public getStack(): StackItem[] {
    return this.stack;
  }

  /** 获取当前指针 */
  public getPointer(): number {
    return this.pointer;
  }

  /** 订阅栈变化，返回一个取消订阅函数 */
  public subscribe(fn: ViewChangeListener): () => void {
    this.listeners.push(fn);
    // 立即通知一次，让订阅者拿到初始值
    fn(this.stack, this.pointer);
    return () => {
      this.listeners = this.listeners.filter(f => f !== fn);
    };
  }

  /** 通知所有监听器 */
  private notify() {
    this.listeners.forEach(fn => fn(this.stack, this.pointer));
  }

  /** 导航到新视图，会截断 pointer 之后的历史 */
  public navigate(view: ViewName) {
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push({ view });
    this.pointer = this.stack.length - 1;
    this.notify();
  }

  /** 后退一步（如果可能） */
  public goBack() {
    if (this.pointer > 0) {
      this.pointer--;
      this.notify();
    }
  }

  /** 前进一步（如果可能） */
  public goForward() {
    if (this.pointer < this.stack.length - 1) {
      this.pointer++;
      this.notify();
    }
  }
}