import { HifiniThreadCacheModel } from '@src/shared/types';


export default interface HifiniThreadCacheRepository {
  findByDataHref(dataHref: string): Promise<HifiniThreadCacheModel | null>;

  create(hifiniThreadCache: HifiniThreadCacheModel): Promise<HifiniThreadCacheModel>;

  delete(dataHref: string): Promise<void>;

  save(hifiniThreadCache: HifiniThreadCacheModel): Promise<HifiniThreadCacheModel>;

}
