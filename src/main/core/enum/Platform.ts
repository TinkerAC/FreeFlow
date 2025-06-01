export enum Platform {
  NET_EASE_CLOUD_MUSIC = 'NetEaseCloudMusic',
  HIFINI = 'Hifini',
  LOCAL = 'Local',
  QQ_MUSIC = 'QQMusic',
}


export enum OS {
  WINDOWS = 'Windows',
  MACOS = 'MacOS',
  LINUX = 'Linux',
  ANDROID = 'Android',
  IOS = 'iOS',
  UNKNOWN = 'Unknown',
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
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

export function castToOperationSystem(os: string): OS {
  switch (os) {
    case OS.WINDOWS:
      return OS.WINDOWS;
    case OS.MACOS:
      return OS.MACOS;
    case OS.LINUX:
      return OS.LINUX;
    case OS.ANDROID:
      return OS.ANDROID;
    case OS.IOS:
      return OS.IOS;
    default:
      return OS.UNKNOWN;
  }
}