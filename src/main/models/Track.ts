// src/main/models/Track.ts

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';


export interface TrackAttributes {
  id: number;
  platform: string;
  platform_unique_id: string;
  title?: string;
  artist?: string;
  album: string;
  duration?: number;
  cover_src?: string;
  lyrics?: string;
  created_at?: Date;
  modified_at?: Date;
}

export interface TrackCreationAttributes extends Optional<TrackAttributes, 'title' | 'artist' | 'duration' | 'cover_src' | 'lyrics' | 'created_at' | 'modified_at'> {
}

export class Track extends Model<TrackAttributes, TrackCreationAttributes> implements TrackAttributes {
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
