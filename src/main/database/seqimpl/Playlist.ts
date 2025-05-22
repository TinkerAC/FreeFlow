import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './database';
import { PlaylistRecordProps } from '@main/database/record/PlaylistRecord';
import { Platform } from '@main/core/enum/Platform';

export interface PlaylistCreationAttributes
  extends Optional<
    PlaylistRecordProps,
    | 'playlist_id'
    | 'playlist_cover'
    | 'description'
    | 'played_count'
    | 'created_at'
    | 'modified_at'
  > {
}

export class Playlist
  extends Model<PlaylistRecordProps, PlaylistCreationAttributes>
  implements PlaylistRecordProps {
  public playlist_id!: number;
  public playlist_cover?: string;
  public title!: string;
  public description?: string;
  public creator!: string;
  public platform!: Platform;
  public platform_unique_id!: string;
  public played_count!: number;
  public created_at?: Date;
  public modified_at?: Date;
}

Playlist.init(
  {
    playlist_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    playlist_cover: DataTypes.TEXT,
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    creator: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    platform: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    platform_unique_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    played_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'playlists',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'modified_at',
  },
);