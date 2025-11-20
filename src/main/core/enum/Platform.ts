export enum Platform {
  NET_EASE_CLOUD_MUSIC = 'NetEaseCloudMusic',
  HIFINI = 'Hifini',
  LOCAL = 'Local',
  QQ_MUSIC = 'QQMusic',
  BILIBILI = 'Bilibili',
  YOUTUBE_MUSIC = 'YouTubeMusic',
  YOUTUBE = 'YouTube',
}


export function castToPlatform(platform: string): Platform {
  switch (platform) {
    case Platform.HIFINI:
      return Platform.HIFINI;
    case Platform.NET_EASE_CLOUD_MUSIC:
      return Platform.NET_EASE_CLOUD_MUSIC;
    case Platform.LOCAL:
      return Platform.LOCAL;
    case Platform.QQ_MUSIC:
      return Platform.QQ_MUSIC;
    case Platform.BILIBILI:
      return Platform.BILIBILI;
    case Platform.YOUTUBE_MUSIC:
      return Platform.YOUTUBE_MUSIC;
    case Platform.YOUTUBE:
      return Platform.YOUTUBE;
    default:
      return Platform.LOCAL;
  }
}

