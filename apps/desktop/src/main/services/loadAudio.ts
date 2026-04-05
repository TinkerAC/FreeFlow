// 返回dataHref的BlobUrl或者file_path对应的音频文件路径

import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

export default async function getAudioSrc(track: TrackEntity): Promise<string> {
  if (!track) {
    console.error('传入track 为空,无法获取音源链接!');
  }

  // 所有平台统一走本地代理（包括 Local），以获得统一的 Range/缓存/鉴权策略
  const proxyUrl = `http://localhost:4399/proxy?platform=${track.platform}&platformUniqueId=${track.platform_unique_id}`;
  return proxyUrl;
}
