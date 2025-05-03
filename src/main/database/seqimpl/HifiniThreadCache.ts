// src/database/HifiniThreadCache.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { injectable } from 'inversify';
import { HifiniThreadCacheEntityProps } from '@main/database/entity/HifiniThreadCacheEntity';


export interface HifiniThreadCacheCreationAttributes extends Optional<HifiniThreadCacheEntityProps, 'cached_at' | 'modified_at'> {
}


@injectable()
export class HifiniThreadCache extends Model<HifiniThreadCacheEntityProps, HifiniThreadCacheCreationAttributes> implements HifiniThreadCacheEntityProps {
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
    cached_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    modified_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'hifini_thread_cache',
    timestamps: false,
    hooks: {
      beforeUpdate: (instance) => {
        instance.modified_at = new Date();
      },
    },
  },
);
