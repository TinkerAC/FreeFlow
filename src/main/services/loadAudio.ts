// 返回dataHref的BlobUrl或者file_path对应的音频文件路径

import { TrackModel } from '@src/shared/types';

export default async function getAudioSrc(
  track: TrackModel,
): Promise<string> {

  if (track === null || track === undefined) {
    console.error('传入track 为空,无法获取音源链接!');
  }

  switch (track.platform) {
    case 'Local': {
      return track.platform_unique_id;
    }
    default: {
      const proxyUrl = `http://localhost:4399/proxy?platform=${track.platform}&platformUniqueId=${track.platform_unique_id}`;
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', proxyUrl, true);
        xhr.responseType = 'blob';
        xhr.onload = function() {
          if (xhr.status === 200 || xhr.status === 206) {

            const blob = xhr.response;
            const blobUrl = URL.createObjectURL(blob);
            resolve(blobUrl); // 返回生成的 blob URL
          } else {
            reject(new Error(`Failed to load audio from data_href via proxy: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = function() {
          console.error(`Network error while trying to load audio via proxy. Proxy URL: ${proxyUrl}`);
          reject(new Error('Network error while trying to load audio via proxy.'));
        };

        xhr.send();
      });
    }
  }
}


