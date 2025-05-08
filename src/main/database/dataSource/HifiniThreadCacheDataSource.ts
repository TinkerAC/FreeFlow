import { HifiniThreadCacheRecord } from '@main/database/record/HifiniThreadCacheRecord';

export interface HifiniThreadCacheDataSource {
  findByDataHref(dataHref: string): Promise<HifiniThreadCacheRecord | null>;

  create(hifiniThreadCache: HifiniThreadCacheRecord): Promise<HifiniThreadCacheRecord>;

  delete(dataHref: string): Promise<number>;

  save(hifiniThreadCache: HifiniThreadCacheRecord): Promise<HifiniThreadCacheRecord>;

}