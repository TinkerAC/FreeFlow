import HifiniThreadCacheRepository from '@main/database/repository/HifiniThreadCacheRepository';
import { HifiniThreadCache, HifiniThreadCacheCreationAttributes } from '@main/database/seqimpl/HifiniThreadCache';
import { inject } from 'inversify';
import HifiniThreadCacheMapper from '@main/database/repository/mappers/HifiniThreadCacheMapper';

import { HifiniThreadCacheEntityProps } from '@main/database/entity/HifiniThreadCacheEntity';
import { HifiniThreadCacheModel } from '@src/shared/domainModel/hifiniThreadCacheModel';

export default class HifiniThreadCacheRepositoryImpl implements HifiniThreadCacheRepository {
  constructor(
    @inject('HifiniThreadCache') private hifiniThreadCache: HifiniThreadCache,
  ) {
  }

  async create(creationAttributes: HifiniThreadCacheCreationAttributes): Promise<HifiniThreadCacheModel> {
    const hifiniThreadCache = await HifiniThreadCache.create(creationAttributes);
    return HifiniThreadCacheMapper.toModel(hifiniThreadCache);
  }

  delete(dataHref: string): Promise<number> {
    return HifiniThreadCache.destroy({
      where: {
        data_href: dataHref,
      },
    });
  }

  async findByDataHref(dataHref: string): Promise<HifiniThreadCacheModel | null> {
    const result = await HifiniThreadCache.findOne({
      where: {
        data_href: dataHref,
      },
    });
    if (result) {
      return HifiniThreadCacheMapper.toModel(result);
    } else {
      return null;
    }
  }

  async save(attributes: HifiniThreadCacheEntityProps): Promise<HifiniThreadCacheModel> {
    const result = await HifiniThreadCache.upsert(attributes);
    return HifiniThreadCacheMapper.toModel(result[0]);
  }


}