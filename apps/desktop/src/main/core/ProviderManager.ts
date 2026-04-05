import { inject, injectable } from 'inversify';
import { ConfigService } from '@main/core/configService';
import { DISymbol } from '@main/di/symbol';
import { Platform } from '@main/core/enum/Platform';
import { AbstractContentProvider } from '@main/contentProvider/AbstractContentProvider';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import Bilibili from '@main/contentProvider/Bilibili/Bilibili';
import YouTubeMusic from '@main/contentProvider/YouTubeMusic/YouTubeMusic';
import YouTube from '@main/contentProvider/YouTube/YouTube';
import { Logger } from 'winston';

type ProviderToggles = {
  netease?: boolean;
  qq?: boolean;
  bilibili?: boolean;
  youtubeMusic?: boolean;
  youtube?: boolean;
  hifini?: boolean;
};

@injectable()
export class ProviderManager {
  /** 统一维护的 Provider 实例表，方便集中管理 */
  private readonly providers = new Map<Platform, AbstractContentProvider>();

  /** Platform 对应配置项 key 的映射表（未在配置中的平台默认始终启用） */
  private readonly toggleKeyByPlatform: Partial<Record<Platform, keyof ProviderToggles>> = {
    [Platform.NET_EASE_CLOUD_MUSIC]: 'netease',
    [Platform.QQ_MUSIC]: 'qq',
    [Platform.BILIBILI]: 'bilibili',
    [Platform.YOUTUBE_MUSIC]: 'youtubeMusic',
    [Platform.YOUTUBE]: 'youtube',
    [Platform.HIFINI]: 'hifini',
  };

  constructor(
    @inject(DISymbol.ConfigService) private readonly config: ConfigService,
    @inject(DISymbol.NetEaseCloudMusic) private readonly netease: NetEaseCloudMusic,
    @inject(DISymbol.QQMusic) private readonly qq: QQMusic,
    @inject(DISymbol.Bilibili) private readonly bilibili: Bilibili,
    @inject(DISymbol.YouTubeMusic) private readonly youtubeMusic: YouTubeMusic,
    @inject(DISymbol.YouTube) private readonly youtube: YouTube,
    @inject(DISymbol.HifiniMusic) private readonly hifini: HifiniMusic,
    @inject(DISymbol.Logger) private readonly logger: Logger,
  ) {
    this.providers.set(Platform.NET_EASE_CLOUD_MUSIC, this.netease);
    this.providers.set(Platform.QQ_MUSIC, this.qq);
    this.providers.set(Platform.BILIBILI, this.bilibili);
    this.providers.set(Platform.YOUTUBE_MUSIC, this.youtubeMusic);
    this.providers.set(Platform.YOUTUBE, this.youtube);
    this.providers.set(Platform.HIFINI, this.hifini);
  }

  /**
   * 读取配置中的 Provider 开关，如未配置则回退到默认开启。
   */
  private readToggles(): Required<ProviderToggles> {
    const toggles = (this.config.get('services.providers') ?? {}) as ProviderToggles;
    return {
      // netease: toggles.netease !== false,
      // qq: toggles.qq !== false,
      // bilibili: toggles.bilibili !== false,
      // youtubeMusic: toggles.youtubeMusic !== false,
      // youtube: toggles.youtube !== false,
      // hifini: toggles.hifini !== false,
      netease:true,
      qq:true,
      bilibili:true,
      youtubeMusic:true,
      youtube:true,
      hifini:false

    };
  }

  private getToggleKey(platform: Platform): keyof ProviderToggles | null {
    return this.toggleKeyByPlatform[platform] ?? null;
  }

  /**
   * 判断目标平台的 Provider 是否被启用。
   */
  isEnabled(platform: Platform, toggles?: Required<ProviderToggles>): boolean {
    const key = this.getToggleKey(platform);
    if (!key) return true;
    const resolved = toggles ?? this.readToggles();
    return resolved[key] !== false;
  }

  /**
   * 更新指定平台的启用状态，同时写回配置。
   */
  setEnabled(platform: Platform, enabled: boolean): void {
    const key = this.getToggleKey(platform);
    if (!key) {
      this.logger.warn(`Provider toggle ignored for platform without config key: ${platform}`);
      return;
    }
    this.config.setByPath(`services.providers.${key}`, enabled);
  }

  tryResolve(platform: Platform): AbstractContentProvider | null {
    if (!this.isEnabled(platform)) return null;
    return this.providers.get(platform) ?? null;
  }

  resolve(platform: Platform): AbstractContentProvider {
    const p = this.tryResolve(platform);
    if (!p) throw new Error(`Provider disabled or not found: ${platform}`);
    return p;
  }

  /**
   * 列出所有启用的 Provider 实例，返回包含平台标识和实例对象的数组。
   * @return 启用的 Provider 列表，每项包含 platform 和 provider 两个字段
   */
  listEnabled(): Array<{ platform: Platform; provider: AbstractContentProvider }> {
    const out: Array<{ platform: Platform; provider: AbstractContentProvider }> = [];
    const toggles = this.readToggles();
    for (const [platform, provider] of this.providers.entries()) {
      if (this.isEnabled(platform, toggles)) out.push({ platform, provider });
    }
    return out;
  }

  getEnabledProviders(): AbstractContentProvider[] {
    return this.listEnabled().map(({ provider }) => provider);
  }

  getSafeProviders(): AbstractContentProvider[] {
    return this.getEnabledProviders().filter((p) => !p.isCensored);
  }
}
