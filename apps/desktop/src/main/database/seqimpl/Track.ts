import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './database';
import { TrackRecordProps } from '@main/database/record/TrackRecord';
import { Platform } from '@main/core/enum/Platform';

/** 创建 Track 实例时可选的属性 */
export interface TrackCreationAttributes
  extends Optional<
    TrackRecordProps,
    | 'id'
    | 'title'
    | 'artist'
    | 'duration'
    | 'cover_src'
    | 'lyrics'
    | 'played_count'
    | 'relative_local_path'
    | 'created_at'
    | 'modified_at'
  > {
}

export class Track
  extends Model<TrackRecordProps, TrackCreationAttributes>
  implements TrackRecordProps {
  public id!: number;
  public platform!: Platform;
  public platform_unique_id!: string;
  public title?: string;
  public artist?: string;
  public album!: string;
  public duration?: number;
  public cover_src?: string;
  public lyrics?: string;
  public played_count!: number;
  public relative_local_path!: string;
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
    played_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    relative_local_path: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
  },
  {
    sequelize,
    tableName: 'track',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'modified_at',
    indexes: [
      {
        unique: true,
        fields: ['platform', 'platform_unique_id'],
        name: 'unique_platform_unique_id',
      },
    ],
  },
);