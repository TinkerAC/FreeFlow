// file: src/main/database/repository/impl/HifiniThreadCacheRepositoryImpl.ts
import { injectable } from 'inversify';
import HifiniThreadCacheRepository from '@main/database/repository/HifiniThreadCacheRepository';
import { HifiniThreadCacheModel } from '@src/shared/domainModel/hifiniThreadCacheModel';
import { HifiniThreadCache } from '@main/database/seqimpl/HifiniThreadCache';
import { HifiniThreadCacheRecord } from '@main/database/record/HifiniThreadCacheRecord';

const mapRowToRecord = (row: HifiniThreadCache): HifiniThreadCacheRecord =>
  Object.assign(new HifiniThreadCacheRecord(), row.get({ plain: true }));

@injectable()
export class HifiniThreadCacheRepositoryImpl implements HifiniThreadCacheRepository {
  async create(attrs: Partial<HifiniThreadCacheModel>): Promise<HifiniThreadCacheModel> {
    const created = await HifiniThreadCache.create(attrs as any);
    return mapRowToRecord(created).toEntity();
  }

  async delete(dataHref: string): Promise<number> {
    return HifiniThreadCache.destroy({ where: { data_href: dataHref } });
  }

  async findByDataHref(dataHref: string): Promise<HifiniThreadCacheModel | null> {
    const row = await HifiniThreadCache.findOne({ where: { data_href: dataHref } });
    return row ? mapRowToRecord(row).toEntity() : null;
  }

  async save(attrs: Partial<HifiniThreadCacheModel>): Promise<HifiniThreadCacheModel> {
    const [row] = await HifiniThreadCache.upsert(attrs as any);
    return mapRowToRecord(row).toEntity();
  }
}
