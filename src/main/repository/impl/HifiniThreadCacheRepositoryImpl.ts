import HifiniThreadCacheRepository from '@main/repository/HifiniThreadCacheRepository';
import {
  HifiniThreadCache,
  HifiniThreadCacheAttributes,
  HifiniThreadCacheCreationAttributes,
} from '@main/models/HifiniThreadCache';
import { inject } from 'inversify';
import { HifiniThreadCacheModel } from '@src/shared/types';
import HifiniThreadCacheMapper from '@main/repository/mappers/HifiniThreadCacheMapper';

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

  async save(attributes: HifiniThreadCacheAttributes): Promise<HifiniThreadCacheModel> {
    const result = await HifiniThreadCache.upsert(attributes);
    return HifiniThreadCacheMapper.toModel(result[0]);
  }


}