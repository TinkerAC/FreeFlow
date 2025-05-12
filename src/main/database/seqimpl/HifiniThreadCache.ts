import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './database';
import { injectable } from 'inversify';
import { HifiniThreadCacheRecordProps } from '@main/database/record/HifiniThreadCacheRecord';

export interface HifiniThreadCacheCreationAttributes
  extends Optional<
    HifiniThreadCacheRecordProps,
    'cached_at' | 'modified_at'
  > {}

@injectable()
export class HifiniThreadCache
  extends Model<
    HifiniThreadCacheRecordProps,
    HifiniThreadCacheCreationAttributes
  >
  implements HifiniThreadCacheRecordProps
{
  public data_href!: string;
  public title?: string;
  public artist?: string;
  public cover_src?: string;
  public un_redirected_url?: string;
  public cached_at?: Date;
  public modified_at?: Date;
}

HifiniThreadCache.init(
  {
    data_href: {
      type: DataTypes.TEXT,
      primaryKey: true,
    },
    title: DataTypes.TEXT,
    artist: DataTypes.TEXT,
    cover_src: DataTypes.TEXT,
    un_redirected_url: DataTypes.TEXT,
  },
  {
    sequelize,
    tableName: 'hifini_thread_cache',
    timestamps: true,
    createdAt: 'cached_at',     // ← 关键：映射到旧列名
    updatedAt: 'modified_at',
  },
);