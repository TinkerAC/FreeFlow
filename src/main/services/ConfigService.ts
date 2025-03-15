import Store from 'electron-store';

export function setConfig(store: Store, key: string, value: string) {
  store.set(key, value);
  console.log(`在配置文件 ${store.path} 中设置配置项 ${key} 的值为 ${value}`);
}

// 使用泛型定义返回值类型
export function getConfig<T>(store: Store, key: string): T {
  const value = store.get(key);
  console.log(`在配置文件 ${store.path} 中获取配置项 ${key} 的值为 ${value}`);
  return value as T;
}

export function hasConfig(store: Store, key: string) {
  return store.has(key);
}