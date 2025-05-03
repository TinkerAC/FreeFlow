import { HifiniThreadCacheModel } from '@src/shared/domainModel/hifiniThreadCacheModel';


export default interface HifiniThreadCacheRepository {
  findByDataHref(dataHref: string): Promise<HifiniThreadCacheModel | null>;

  create(hifiniThreadCache: HifiniThreadCacheModel): Promise<HifiniThreadCacheModel>;

  delete(dataHref: string): Promise<number>;

  save(hifiniThreadCache: HifiniThreadCacheModel): Promise<HifiniThreadCacheModel>;

}
