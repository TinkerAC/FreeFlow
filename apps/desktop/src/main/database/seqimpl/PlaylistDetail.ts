import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './database';
import { Playlist } from './Playlist';
import { Track } from './Track';
import { PlaylistDetailRecordProps } from '@main/database/record/PlaylistDetailRecord';

export interface PlaylistDetailCreationAttributes
  extends Optional<
    PlaylistDetailRecordProps,
    'position' | 'created_at' | 'modified_at'
  > {
}

export class PlaylistDetail
  extends Model<PlaylistDetailRecordProps, PlaylistDetailCreationAttributes>
  implements PlaylistDetailRecordProps {
  public playlist_id!: number;
  public track_id!: number;
  public position?: number;
  public created_at?: Date;
  public modified_at?: Date;
}

PlaylistDetail.init(
  {
    playlist_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: Playlist, key: 'playlist_id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    track_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: Track, key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'playlist_detail',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'modified_at',
  },
);