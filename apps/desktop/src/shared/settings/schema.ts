import { z } from 'zod';
import { AppIcon } from '@src/shared/hifiniCookies';

/** ------- 主题 ------- */
export const ThemeMode = z.enum(['light', 'dark', 'system']);
export type ThemeMode = z.infer<typeof ThemeMode>;

/** 主题来源：Material You 或 预设 */
export const ThemeSource = z.enum(['material-you', 'preset']);
export type ThemeSource = z.infer<typeof ThemeSource>;

/** 预设主题名：扩展包含一组观感较好的种子色 */
export const ThemePreset = z.enum([
  'classic',
  'spotify',
  'netease',
  // palette-based presets
  'indigo',
  'blue',
  'cyan',
  'green',
  'lime',
  'amber',
  'orange',
  'red',
  'pink',
  'purple',
  'deepPurple',
  'indigoDeep',
  'lightBlue',
  'teal',
  'lightGreen',
  'limeDeep',
  'yellow',
  'amberDeep',
  'deepOrange',
  'brown',
  'blueGrey',
]);
export type ThemePreset = z.infer<typeof ThemePreset>;

export const ThemeSettings = z.object({
  mode: ThemeMode.default('dark'),
  source: ThemeSource.default('material-you'),
  seed: z.string().default('#66ccff'),    // 仅在 source === 'material-you' 时使用
  /** Material You 种子色预设（可编辑） */
  materialSeedPresets: z.array(z.string()).default([
    '#6750A4', // Indigo
    '#1E88E5', // Blue
    '#00ACC1', // Cyan
    '#43A047', // Green
    '#7CB342', // Lime
    '#FBC02D', // Amber
    '#FB8C00', // Orange
    '#E53935', // Red
    '#D81B60', // Pink
    '#8E24AA', // Purple
    '#5E35B1', // Deep Purple
    '#3949AB', // Indigo Deep
    '#039BE5', // Light Blue
    '#00897B', // Teal
    '#C0CA33', // Lime Deep
    '#FDD835', // Yellow
    '#FFB300', // Amber Deep
    '#F4511E', // Deep Orange
    '#6D4C41', // Brown
    '#546E7A', // Blue Grey
  ]),
  preset: ThemePreset.default('classic'),  // 仅在 source === 'preset' 时使用
  /** 是否每日自动更换新的种子颜色（仅对 Material You 有效） */
  autoDailySeed: z.boolean().default(false),
  /** 上次自动更新种子色的日期 (YYYY-MM-DD) */
  lastDailySeedDate: z.string().optional(),
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
  turntable: TurntableSettings.default({
    speedMode: 'preset',
    preset: 'medium',
    customAngularVelocityRadPerSec: 0.4488,
  }),
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
  supportedFormats: z.array(z.string()).default(['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'webm', 'opus', 'oga']),
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
  /** 各内容提供商的开关（统一入口） */
  providers: z
    .object({
      netease: z.boolean().default(true),
      qq: z.boolean().default(true),
      bilibili: z.boolean().default(true),
      youtubeMusic: z.boolean().default(true),
      hifini: z.boolean().default(true),
    })
    .default({
      netease: true,
      qq: true,
      bilibili: true,
      youtubeMusic: true,
      hifini: true,
    }),
  youtubeMusic: z.object({
    cookie: z.string().default(''),
    visitorData: z.string().default(''),
  }).default({ cookie: '', visitorData: '' }),
  pinata: z.object({
    jwt: z.string().default(''),
    gateway: z.string().default(''),
    apiBaseUrl: z.string().default('https://uploads.pinata.cloud/v3/files'),
    network: z.enum(['public', 'private']).default('public'),
    groupId: z.string().default(''),
    useSignedUploads: z.boolean().default(false),
    signedUploadUrl: z.string().default(''),
  }).default({
    jwt: '',
    gateway: '',
    apiBaseUrl: 'https://uploads.pinata.cloud/v3/files',
    network: 'public',
    groupId: '',
    useSignedUploads: false,
    signedUploadUrl: '',
  }),
  web25Backend: z.object({
    baseUrl: z.string().default('http://localhost:8787'),
  }).default({
    baseUrl: 'http://localhost:8787',
  }),
  ai: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['gemini']).default('gemini'),
    geminiApiKey: z.string().default(''),
    geminiModel: z.string().default('gemini-2.5-flash'),
  }).default({ enabled: false, provider: 'gemini', geminiApiKey: '', geminiModel: 'gemini-2.5-flash' }),
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
    materialSeedPresets: [
      '#6750A4', '#1E88E5', '#00ACC1', '#43A047', '#7CB342', '#FBC02D', '#FB8C00', '#E53935',
      '#D81B60', '#8E24AA', '#5E35B1', '#3949AB', '#039BE5', '#00897B', '#C0CA33', '#FDD835',
      '#FFB300', '#F4511E', '#6D4C41', '#546E7A',
    ],
    preset: 'classic',
    autoDailySeed: false,
  }),
  ui: UISettings.default({
    density: 'cozy',
    sidebarCollapsed: false,
    miniPlayer: { width: 360, height: 140 },
    turntable: { speedMode: 'preset', preset: 'medium', customAngularVelocityRadPerSec: 0.4488 },
  }),
  audio: AudioSettings.default({
    volume: 0.8,
    progressSkin: 'classic',
  }),
  library: LibrarySettings.default({
    scanPaths: [],
    supportedFormats: ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac'],
  }),
  network: NetworkSettings.default({ port: 29321 }),
  services: ServiceSettings.default({
    hifiniCookie: { bbs_sid: '', bbs_token: '' },
    providers: { netease: true, qq: true, bilibili: true, youtubeMusic: true, hifini: true },
    youtubeMusic: { cookie: '', visitorData: '' },
    pinata: {
      jwt: '',
      gateway: '',
      apiBaseUrl: 'https://uploads.pinata.cloud/v3/files',
      network: 'public',
      groupId: '',
      useSignedUploads: false,
      signedUploadUrl: '',
    },
    web25Backend: {
      baseUrl: 'http://localhost:8788',
    },
    ai: { enabled: false, provider: 'gemini', geminiApiKey: '', geminiModel: 'gemini-1.5-flash' },
  }),
  user: UserSettings.default({ userName: '', avatarPath: '' }),
  cache: CacheSettings.default({ cacheTime: 3600 }),
});
export type Settings = z.infer<typeof Settings>;

export const defaultSettings: Settings = Settings.parse({});
