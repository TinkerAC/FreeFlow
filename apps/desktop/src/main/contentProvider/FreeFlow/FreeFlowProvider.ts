import axios from 'axios';
import { inject, injectable } from 'inversify';
import { AbstractContentProvider } from '@main/contentProvider/AbstractContentProvider';
import { Platform } from '@main/core/enum/Platform';
import { ConfigService } from '@main/core/configService';
import { DISymbol } from '@main/di/symbol';
import { FreeFlowTrackInfo, FreeFlowTrackModel, TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Lyric } from '@src/shared/domainModel/lyricLine';
import { parseFreeFlowLyricsMetadata } from '@src/shared/metadata/freeflowLyrics';
import { Logger } from 'winston';

type JsonRecord = Record<string, unknown>;

type ResourceTrackPayload = {
  resourceKey: string;
  title: string | null;
  artistName: string | null;
  albumName: string | null;
  chainId: number | null;
  contractAddress: string | null;
  tokenId: string | null;
  coverUrl: string | null;
  coverCid: string | null;
  audioUrl: string | null;
  audioCid: string | null;
  metadataUrl: string | null;
  metadataCid: string | null;
  accessModel: string | null;
  previewSeconds: number | null;
  priceEth: string | null;
  explorerUrl: string | null;
  platformHubAddress: string | null;
  publishTxHash: string | null;
  releaseId: string | null;
  status: string | null;
  metadataDocument: unknown | null;
};

type ResourceSearchResponse = {
  ok: boolean;
  data?: {
    items: ResourceTrackPayload[];
  };
};

type ResourceResolveResponse = {
  ok: boolean;
  data?: ResourceTrackPayload;
};

@injectable()
export default class FreeFlowProvider extends AbstractContentProvider {
  public readonly platformName: Platform = Platform.FREEFLOW;
  public readonly serverNodes: string[] = [];
  protected readonly detailCache = new Map<string, ResourceTrackPayload>();
  private readonly metadataCache = new Map<string, JsonRecord | null>();

  constructor(
    @inject(DISymbol.ConfigService) private readonly configService: ConfigService,
    @inject(DISymbol.Logger) protected readonly logger: Logger,
  ) {
    super();
  }

  private resolveBaseUrl() {
    const raw = String(this.configService.get('services.web25Backend.baseUrl') ?? 'http://localhost:8787');
    return raw.trim().replace(/\/$/, '');
  }

  private asRecord(value: unknown): JsonRecord | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
  }

  private pickLyricsMetadata(metadata: JsonRecord | null): unknown {
    const properties = this.asRecord(metadata?.properties);
    return properties?.lyrics ?? metadata?.lyrics ?? null;
  }

  private toTrackInfo(item: ResourceTrackPayload): FreeFlowTrackInfo {
    return {
      resourceKey: item.resourceKey,
      chainId: item.chainId ?? null,
      contractAddress: item.contractAddress ?? null,
      tokenId: item.tokenId ?? null,
      accessModel: item.accessModel ?? null,
      previewSeconds: item.previewSeconds ?? null,
      priceEth: item.priceEth ?? null,
      coverUrl: item.coverUrl ?? null,
      coverCid: item.coverCid ?? null,
      audioUrl: item.audioUrl ?? null,
      audioCid: item.audioCid ?? null,
      metadataUrl: item.metadataUrl ?? null,
      metadataCid: item.metadataCid ?? null,
      explorerUrl: item.explorerUrl ?? null,
      platformHubAddress: item.platformHubAddress ?? null,
      publishTxHash: item.publishTxHash ?? null,
      releaseId: item.releaseId ?? null,
      status: item.status ?? null,
      metadataDocument: item.metadataDocument ?? null,
    };
  }

  private toTrack(item: ResourceTrackPayload): TrackEntity {
    this.detailCache.set(item.resourceKey, item);
    return FreeFlowTrackModel.build({
      platform_unique_id: item.resourceKey,
      title: item.title ?? (item.tokenId ? `Token #${item.tokenId}` : 'Untitled Track'),
      artist: item.artistName ?? 'Unknown Artist',
      album: item.albumName ?? 'FreeFlow',
      duration: item.previewSeconds ?? 0,
      cover_src: item.coverUrl ?? '',
      freeflow: this.toTrackInfo(item),
    });
  }

  async searchTrack(keyword: string, _filterPaid: boolean = false): Promise<TrackEntity[]> {
    const query = new URLSearchParams({
      q: keyword.trim(),
      limit: '30',
    });

    const url = `${this.resolveBaseUrl()}/api/v1/resources/search?${query.toString()}`;
    try {
      const response = await axios.get<ResourceSearchResponse>(url, { timeout: 10_000 });
      const items = response.data?.data?.items ?? [];
      return items.map((item) => this.toTrack(item));
    } catch (error) {
      this.logger.warn(`[freeflow.provider] searchTrack failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private async resolveResourceByKey(resourceKey: string): Promise<ResourceTrackPayload | null> {
    if (!resourceKey) return null;
    const cached = this.detailCache.get(resourceKey);
    if (cached) return cached;

    const query = new URLSearchParams({ resourceKey });
    const url = `${this.resolveBaseUrl()}/api/v1/resources/resolve?${query.toString()}`;
    try {
      const response = await axios.get<ResourceResolveResponse>(url, { timeout: 10_000 });
      const payload = response.data?.data ?? null;
      if (payload) this.detailCache.set(resourceKey, payload);
      return payload;
    } catch (error) {
      this.logger.warn(
        `[freeflow.provider] resolveResource failed (${resourceKey}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async resolveMetadata(payload: ResourceTrackPayload): Promise<JsonRecord | null> {
    const embedded = this.asRecord(payload.metadataDocument);
    if (embedded) return embedded;
    if (!payload.metadataUrl) return null;

    const cached = this.metadataCache.get(payload.metadataUrl);
    if (cached !== undefined) return cached;

    try {
      const response = await axios.get<unknown>(payload.metadataUrl, { timeout: 10_000 });
      const metadata = this.asRecord(response.data);
      this.metadataCache.set(payload.metadataUrl, metadata);
      return metadata;
    } catch (error) {
      this.logger.warn(
        `[freeflow.provider] metadata fetch failed (${payload.metadataUrl}): ${error instanceof Error ? error.message : String(error)}`,
      );
      this.metadataCache.set(payload.metadataUrl, null);
      return null;
    }
  }

  async getTrackLink(uniqueId: string): Promise<string | undefined> {
    const payload = await this.resolveResourceByKey(uniqueId);
    return payload?.audioUrl ?? undefined;
  }

  async getLyrics(uniqueId: string): Promise<Lyric> {
    const payload = await this.resolveResourceByKey(uniqueId);
    if (!payload) return new Lyric();

    const metadata = await this.resolveMetadata(payload);
    const lines = parseFreeFlowLyricsMetadata(this.pickLyricsMetadata(metadata));
    return new Lyric(lines, [], []);
  }

  isFree(song: any): boolean {
    return song?.freeflow?.accessModel !== 'purchase';
  }
}
