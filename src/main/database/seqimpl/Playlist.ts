// src/database/Playlist.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { PlaylistRecordProps } from '@main/database/record/PlaylistRecord';


interface PlaylistCreationAttributes extends Optional<PlaylistRecordProps, 'created_at' | 'modified_at'> {

}


export class Playlist extends Model<PlaylistRecordProps, PlaylistCreationAttributes> implements PlaylistRecordProps {
  public playlist_id!: number;
  public playlist_cover?: string;
  public title!: string;
  public description?: string;
  public creator!: string;
  public created_at?: Date;
  public modified_at?: Date;
  public platform: string;
  public platform_unique_id: string;
  public played_count: number;
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
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    modified_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
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
    timestamps: false,
    hooks: {
      beforeUpdate: (instance) => {
        instance.modified_at = new Date();
      },
    },
  },
);
