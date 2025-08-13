export enum OS {
  WINDOWS = 'Windows',
  MACOS = 'MacOS',
  LINUX = 'Linux',
  ANDROID = 'Android',
  IOS = 'IOS',
  UNKNOWN = 'Unknown',
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