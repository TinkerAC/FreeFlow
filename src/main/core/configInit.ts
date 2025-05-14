// file: src/main/configInit.ts

import Store from 'electron-store';

export async function initConfig(store: Store): Promise<void> {
  if (store.get('scan_paths') === undefined) {
    console.log('scan_paths initialized');
    store.set('scan_paths', []);
  }

  if (store.get('supported_formats') === undefined) {
    console.log('supported_formats initialized');
    store.set('supported_formats', [
      'mp3',
      'wav',
      'flac',
      'ogg',
      'm4a',
      'aac',
      'webm',
      'opus',
      'oga',
    ]);
  }

  if (store.get('port') === undefined) {
    console.log('proxy_port initialized');
    store.set('port', 3000);
  }

  if (store.get('hifini_cookie') === undefined) {
    console.log('hifini_cookie initialized');
    store.set('hifini_cookie', {
      bbs_sid: '',
      bbs_token: '',
    });
  }
  if (store.get('user_name') === undefined) {
    console.log('user_name initialized');
    store.set('user_name', '');
  }
  if (store.get('avatar_path') === undefined) {
    console.log('avatar_path initialized');
    store.set('avatar_path', '');
  }

  if (store.get('cacheTime') === undefined) {
    console.log('cacheTime initialized');
    store.set('cacheTime', 864000); // 10 days
  }
}