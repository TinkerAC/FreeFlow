import Store from 'electron-store';

export function setConfig(store: any, key: string, value: any) {
  store.set(key, value);
  console.log(`在配置文件${store.path}中设置配置项 ${key} 的值为 ${value}`);
}

export function getConfig(store: any, key: string) {
  const value = store.get(key);
  console.log(` 在配置文件${store.path}中获取配置项 ${key} 的值为 ${value}`);
  return value;
}

export function hasConfig(store: any, key: string) {
  return store.has(key);
}