// src/main/database/Track.ts

import { DataTypes, Model, Optional } from 'sequelize';
import { TrackRecordProps } from '@main/database/record/TrackRecord';
import { sequelize } from '@main/database/seqimpl/database';

/**
 * 定义创建 Track 实例时可选的属性,防止编译器报错
 */
export interface TrackCreationAttributes extends Optional<TrackRecordProps, 'id' | 'title' | 'artist' | 'duration' | 'cover_src' | 'lyrics' | 'created_at' | 'modified_at'> {
}

export class Track extends Model<TrackRecordProps, TrackCreationAttributes> implements TrackRecordProps {
  public id!: number;
  public platform!: string;
  public platform_unique_id!: string;
  public title?: string;
  public artist?: string;
  public album!: string;
  public duration?: number;
  public cover_src?: string;
  public lyrics?: string;
  public created_at?: Date;
  public modified_at?: Date;
}

Track.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    platform: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    platform_unique_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    title: DataTypes.TEXT,
    artist: DataTypes.TEXT,
    album: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    duration: DataTypes.INTEGER,
    cover_src: DataTypes.TEXT,
    lyrics: DataTypes.TEXT,
    created_at: {
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
    tableName: 'track',
    timestamps: false,
    hooks: {
      beforeUpdate: (instance) => {
        instance.modified_at = new Date();
      },
    },
    indexes: [
      {
        unique: true,
        fields: ['platform', 'platform_unique_id'],
        name: 'unique_platform_unique_id', // 为索引命名以便后续管理
      },
    ],
  },
);
