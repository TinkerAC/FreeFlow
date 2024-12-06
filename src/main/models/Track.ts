// src/models/TrackModel.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';


export interface TrackAttributes {
  track_id: number;
  data_href?: string;
  file_path?: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  cover_src?: string;
  lyrics?: string;
  created_at?: Date;
  modified_at?: Date;
}


export interface TrackCreationAttributes extends Optional<TrackAttributes, 'track_id' | 'created_at' | 'modified_at'> {
}


export class Track extends Model<TrackAttributes, TrackCreationAttributes> implements TrackAttributes {
  public track_id!: number;
  public data_href?: string;
  public file_path?: string;
  public title?: string;
  public artist?: string;
  public album?: string;
  public duration?: number;
  public cover_src?: string;
  public lyrics?: string;
  public created_at?: Date;
  public modified_at?: Date;
}

Track.init(
  {
    track_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    data_href: DataTypes.TEXT,
    file_path: DataTypes.TEXT,
    title: DataTypes.TEXT,
    artist: DataTypes.TEXT,
    album: DataTypes.TEXT,
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
  },
);
