import { z } from 'zod';
import { AppIcon } from '@src/shared/hifiniCookies';

/** ------- 主题 ------- */
export const ThemeMode = z.enum(['light', 'dark', 'system']);
export type ThemeMode = z.infer<typeof ThemeMode>;

/** 主题来源：Material You 或 预设 */
export const ThemeSource = z.enum(['material-you', 'preset']);
export type ThemeSource = z.infer<typeof ThemeSource>;

/** 预设主题名：你可以继续扩展 */
export const ThemePreset = z.enum(['classic', 'spotify', 'netease']);
export type ThemePreset = z.infer<typeof ThemePreset>;

export const ThemeSettings = z.object({
  mode: ThemeMode.default('dark'),
  source: ThemeSource.default('material-you'),
  seed: z.string().default('#66ccff'),    // 仅在 source === 'material-you' 时使用
  preset: ThemePreset.default('classic'),  // 仅在 source === 'preset' 时使用
  /** 是否每日自动更换新的种子颜色（仅对 Material You 有效） */
  autoDailySeed: z.boolean().default(false),
});
export type ThemeSettings = z.infer<typeof ThemeSettings>;

/** ------- UI ------- */
const MiniPlayerBounds = z.object({
  x: z.number().int().optional(),
  y: z.number().int().optional(),
  width: z.number().int().default(360),
  height: z.number().int().default(140),
});

export const TurntableSettings = z.object({
  /** 唱片转速模式：预设 或 自定义 */
  speedMode: z.enum(['preset', 'custom']).default('preset'),
  /** 预设档位：慢/中/快 */
  preset: z.enum(['slow', 'medium', 'fast']).default('medium'),
  /** 自定义转速，rad/s */
  customAngularVelocityRadPerSec: z.number().min(0.01).max(20).default(0.4488),
});
export type TurntableSettings = z.infer<typeof TurntableSettings>;

export const UISettings = z.object({
  density: z.enum(['compact', 'cozy']).default('cozy'),
  sidebarCollapsed: z.boolean().default(true),
  /** 迷你播放器窗口的上次位置与尺寸 */
  miniPlayer: MiniPlayerBounds.default({ width: 360, height: 140 }),
  /** 唱机设置 */
  turntable: TurntableSettings.default({ speedMode: 'preset', preset: 'medium', customAngularVelocityRadPerSec: 0.4488 }),
});
export type UISettings = z.infer<typeof UISettings>;

/** ------- 音频 ------- */
export const AudioSettings = z.object({
  volume: z.number().min(0).max(1).default(0.8),
  progressSkin: z.enum(['classic', 'neon', 'waveform', 'knob']).default('classic'),
});
export type AudioSettings = z.infer<typeof AudioSettings>;

/** ------- 音乐库 ------- */
export const LibrarySettings = z.object({
  scanPaths: z.array(z.string()).default([]),
  supportedFormats: z.array(z.string()).default(['mp3','wav','flac','ogg','m4a','aac','webm','opus','oga']),
});
export type LibrarySettings = z.infer<typeof LibrarySettings>;

/** ------- 网络 ------- */
export const NetworkSettings = z.object({
  port: z.number().int().default(3000),
});
export type NetworkSettings = z.infer<typeof NetworkSettings>;

/** ------- 服务 ------- */
export const ServiceSettings = z.object({
  hifiniCookie: z.object({
    bbs_sid: z.string().default(''),
    bbs_token: z.string().default(''),
  }).default({ bbs_sid: '', bbs_token: '' }),
});
export type ServiceSettings = z.infer<typeof ServiceSettings>;

/** ------- 用户 ------- */
export const UserSettings = z.object({
  userName: z.string().default(''),
  avatarPath: z.string().default(''),
});
export type UserSettings = z.infer<typeof UserSettings>;

/** ------- 缓存 ------- */
export const CacheSettings = z.object({
  cacheTime: z.number().int().default(864000),
});
export type CacheSettings = z.infer<typeof CacheSettings>;

/** ------- 应用 ------- */
export const AppSettings = z.object({
  icon: z.nativeEnum(AppIcon).default(AppIcon.Default),
});
export type AppSettings = z.infer<typeof AppSettings>;

/** ------- 唱机（Turntable） ------- */
/** ------- 总配置 ------- */

export const Settings = z.object({
  version: z.number().int().default(1),
  app: AppSettings.default({ icon: AppIcon.Default }),
  theme: ThemeSettings.default({
    mode: 'system',
    source: 'preset',
    seed: '#6750A4',
    preset: 'classic',
    autoDailySeed: false,
  }),
  ui: UISettings.default({
    density: 'cozy',
    sidebarCollapsed: false,
    miniPlayer: { width: 360, height: 140 },
  }),
  audio: AudioSettings.default({
    volume: 0.8,
    progressSkin: 'classic',
  }),
  library: LibrarySettings.default({
    scanPaths: [],
    supportedFormats: ['mp3','flac','wav','m4a','ogg','aac'],
  }),
  network: NetworkSettings.default({ port: 29321 }),
  services: ServiceSettings.default({ hifiniCookie: { bbs_sid: '', bbs_token: '' } }),
  user: UserSettings.default({ userName: '', avatarPath: '' }),
  cache: CacheSettings.default({ cacheTime: 3600 }),
});
export type Settings = z.infer<typeof Settings>;

export const defaultSettings: Settings = Settings.parse({});
