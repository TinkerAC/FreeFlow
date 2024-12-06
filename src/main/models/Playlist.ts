// src/models/Playlist.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index';

export class Playlist extends Model {
  public playlist_id!: number;
  public playlist_cover?: string;
  public title!: string;
  public description?: string;
  public creator!: string;
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
    tableName: 'playlists',
    timestamps: false,
    hooks: {
      beforeUpdate: (instance) => {
        instance.modified_at = new Date();
      },
    },
  },
);
