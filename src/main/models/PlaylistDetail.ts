// src/models/PlaylistDetail.ts

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
 * 继承自 PlaylistDetailAttributes 并将 'created_at' 和 'modified_at' 设为可选
 */
export interface PlaylistDetailCreationAttributes extends Optional<PlaylistDetailAttributes, 'created_at' | 'modified_at'> {}

/**
 * PlaylistDetail 模型
 * 继承自 Sequelize 的 Model 类，并指定属性和创建属性的类型
 */
export class PlaylistDetail extends Model<PlaylistDetailAttributes, PlaylistDetailCreationAttributes>
  implements PlaylistDetailAttributes {
  public playlist_id!: number;
  public track_id!: number;
  public created_at?: Date;
  public modified_at?: Date;

  // 如果需要，可以添加关联方法或其他实例方法
}

// 初始化 PlaylistDetail 模型
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
        key: 'track_id',
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
    timestamps: false, // 因为我们手动管理 created_at 和 modified_at
    hooks: {
      beforeUpdate: (instance: PlaylistDetail) => {
        instance.modified_at = new Date();
      },
    },
  }
);
