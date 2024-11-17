import Store from 'electron-store';

export function setConfig(store, key, value) {
    store.set(key, value);
    console.log(`在配置文件${store.path}中设置配置项 ${key} 的值为 ${value}`);
}

export function getConfig(store, key) {
    const value = store.get(key);
    console.log(` 在配置文件${store.path}中获取配置项 ${key} 的值为 ${value}`);
    return value;
}

export function hasConfig(store, key) {
    return store.has(key);
}