// file: src/main/database/repository/impl/HifiniThreadCacheRepositoryImpl.ts
import { inject, injectable } from 'inversify';
import HifiniThreadCacheRepository from '@main/database/repository/HifiniThreadCacheRepository';
import { HifiniThreadCacheDataSource } from '@main/database/dataSource/HifiniThreadCacheDataSource';
import { HifiniThreadCacheModel } from '@src/shared/domainModel/hifiniThreadCacheModel';

@injectable()
export class HifiniThreadCacheRepositoryImpl implements HifiniThreadCacheRepository {
  constructor(
    @inject('HifiniThreadCacheDataSource') private ds: HifiniThreadCacheDataSource,
  ) {
  }

  async create(attrs: Partial<HifiniThreadCacheModel>): Promise<HifiniThreadCacheModel> {
    const rec = await this.ds.create(attrs as any);
    return rec.toEntity();
  }

  async delete(dataHref: string): Promise<number> {
    return this.ds.delete(dataHref);
  }

  async findByDataHref(dataHref: string): Promise<HifiniThreadCacheModel | null> {
    const rec = await this.ds.findByDataHref(dataHref);
    return rec ? rec.toEntity() : null;
  }

  async save(attrs: Partial<HifiniThreadCacheModel>): Promise<HifiniThreadCacheModel> {
    const rec = await this.ds.save(attrs as any);
    return rec.toEntity();
  }
}