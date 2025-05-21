// file: src/renderer/services/MainWindowService.ts
type Subscriber = () => void;

export default class MainWindowService {
  isMusicLibraryCollapsed = false;
  isRightContentVisible = true;
  private subscribers: Subscriber[] = [];

  constructor() {
    this.handleResize = this.handleResize.bind(this);
    this.init();
  }

  private init() {
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize() {
    const w = window.innerWidth;
    if (w < 1000) {
      this.isMusicLibraryCollapsed = true;
      this.isRightContentVisible = false;
    } else if (w < 1400) {
      this.isMusicLibraryCollapsed = true;
      this.isRightContentVisible = true;
    } else {
      this.isMusicLibraryCollapsed = false;
      this.isRightContentVisible = true;
    }
    this.notify();
  }

  toggleMusicLibraryCollapsed() {
    this.isMusicLibraryCollapsed = !this.isMusicLibraryCollapsed;
    this.notify();
  }

  toggleRightContent() {
    this.isRightContentVisible = !this.isRightContentVisible;
    this.notify();
  }

  subscribe(fn: Subscriber) {
    this.subscribers.push(fn);
    fn();
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn);
    };
  }

  private notify() {
    this.subscribers.forEach(fn => fn());
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize);
    this.subscribers = [];
  }
}