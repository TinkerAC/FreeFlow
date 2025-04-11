// src/main/models/PlaylistDetail.ts

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { Playlist } from './Playlist';
import { Track } from './Track';

/**
 * 定义 PlaylistDetail 表的所有属性
 */
export interface PlaylistDetailAttributes {
  playlist_id: number;
  track_id: number;
  created_at?: Date;
  modified_at?: Date;
}

/**
 * 定义创建 PlaylistDetail 实例时可选的属性
 */
export interface PlaylistDetailCreationAttributes extends Optional<PlaylistDetailAttributes, 'created_at' | 'modified_at'> {}

/**
 * PlaylistDetail 模型
 */
export class PlaylistDetail extends Model<PlaylistDetailAttributes, PlaylistDetailCreationAttributes>
  implements PlaylistDetailAttributes {
  public playlist_id!: number;
  public track_id!: number;
  public created_at?: Date;
  public modified_at?: Date;
}

PlaylistDetail.init(
  {
    playlist_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: Playlist,
        key: 'playlist_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    track_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: Track,
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    modified_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'playlist_detail',
    timestamps: false,
    hooks: {
      beforeUpdate: (instance: PlaylistDetail) => {
        instance.modified_at = new Date();
      },
    },
  }
);

