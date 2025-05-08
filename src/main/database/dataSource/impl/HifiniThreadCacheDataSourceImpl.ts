import { HifiniThreadCacheDataSource } from '@main/database/dataSource/HifiniThreadCacheDataSource';
import {
  HifiniThreadCacheRecord,
  HifiniThreadCacheRecordProps,
} from '@main/database/record/HifiniThreadCacheRecord';
import { HifiniThreadCache } from '@main/database/seqimpl/HifiniThreadCache';
import { injectable } from 'inversify';

@injectable()
export class HifiniThreadCacheDataSourceImpl implements HifiniThreadCacheDataSource {
  async create(rec: HifiniThreadCacheRecord): Promise<HifiniThreadCacheRecord> {
    const created = await HifiniThreadCache.create(rec);
    return Object.assign(new HifiniThreadCacheRecord(), created.get({ plain: true }));
  }

  async delete(dataHref: string): Promise<number> {
    return HifiniThreadCache.destroy({ where: { data_href: dataHref } });
  }

  async findByDataHref(dataHref: string): Promise<HifiniThreadCacheRecord | null> {
    const row = await HifiniThreadCache.findOne({ where: { data_href: dataHref } });
    return row ? Object.assign(new HifiniThreadCacheRecord(), row.get({ plain: true })) : null;
  }

  async save(attrs: HifiniThreadCacheRecordProps): Promise<HifiniThreadCacheRecord> {
    const [row] = await HifiniThreadCache.upsert(attrs);
    return Object.assign(new HifiniThreadCacheRecord(), row.get({ plain: true }));
  }
}