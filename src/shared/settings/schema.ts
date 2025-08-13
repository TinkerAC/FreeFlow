import { z } from 'zod';

/** 明暗模式 */
export const ThemeMode = z.enum(['light', 'dark', 'system']);
export type ThemeMode = z.infer<typeof ThemeMode>;

/** 主题来源（预设） */
export const ThemeSource = z.enum(['material-you', 'spotify', 'netease']);
export type ThemeSource = z.infer<typeof ThemeSource>;

/** 主题配置 */
export const ThemeSettings = z.object({
  mode: ThemeMode.default('dark'),
  /** 仅在 material-you 下生效 */
  seed: z.string().default('#66ccff'),
  /** 主题来源：动态配色 or 预设 */
  source: ThemeSource.default('material-you'),
});
export type ThemeSettings = z.infer<typeof ThemeSettings>;

/** UI 外观/密度等 */
export const UISettings = z.object({
  density: z.enum(['compact', 'cozy']).default('cozy'),
  sidebarCollapsed: z.boolean().default(true),
});
export type UISettings = z.infer<typeof UISettings>;

/** 播放相关 */
export const AudioSettings = z.object({
  volume: z.number().min(0).max(1).default(0.8),
  progressSkin: z.enum(['classic', 'neon', 'waveform', 'knob']).default('classic'),
});
export type AudioSettings = z.infer<typeof AudioSettings>;

/** 音乐库 */
export const LibrarySettings = z.object({
  scanPaths: z.array(z.string()).default([]),
  supportedFormats: z
    .array(z.string())
    .default(['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'webm', 'opus', 'oga']),
});
export type LibrarySettings = z.infer<typeof LibrarySettings>;

/** 网络 */
export const NetworkSettings = z.object({
  port: z.number().int().default(3000),
});
export type NetworkSettings = z.infer<typeof NetworkSettings>;

/** 外部服务 */
export const ServiceSettings = z.object({
  hifiniCookie: z
    .object({
      bbs_sid: z.string().default(''),
      bbs_token: z.string().default(''),
    })
    .default({ bbs_sid: '', bbs_token: '' }),
});
export type ServiceSettings = z.infer<typeof ServiceSettings>;

/** 用户 */
export const UserSettings = z.object({
  userName: z.string().default(''),
  avatarPath: z.string().default(''),
});
export type UserSettings = z.infer<typeof UserSettings>;

/** 缓存 */
export const CacheSettings = z.object({
  cacheTime: z.number().int().default(864000),
});
export type CacheSettings = z.infer<typeof CacheSettings>;

/** 应用总配置 */
export const Settings = z.object({
  version: z.number().int().default(1),
  theme: ThemeSettings.default({}),
  ui: UISettings.default({}),
  audio: AudioSettings.default({}),
  library: LibrarySettings.default({}),
  network: NetworkSettings.default({}),
  services: ServiceSettings.default({}),
  user: UserSettings.default({}),
  cache: CacheSettings.default({}),
});
export type Settings = z.infer<typeof Settings>;

/** 默认配置（确保旧数据或空数据能被“填充”为完整结构） */
export const defaultSettings: Settings = Settings.parse({});