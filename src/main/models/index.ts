// src/main/models/index.ts
import { sequelize } from './database';
import { Track } from './Track';
import { Playlist } from './Playlist';
import { PlaylistDetail } from './PlaylistDetail';

// 定义关联
Track.belongsToMany(Playlist, {
  through: PlaylistDetail,
  foreignKey: 'track_id',
  otherKey: 'playlist_id',
});

Playlist.belongsToMany(Track, {
  through: PlaylistDetail,
  foreignKey: 'playlist_id',
  otherKey: 'track_id',
});

PlaylistDetail.belongsTo(Track, { foreignKey: 'track_id' });
PlaylistDetail.belongsTo(Playlist, { foreignKey: 'playlist_id' });

// 导出模型和 sequelize 实例
export { sequelize, Track, Playlist, PlaylistDetail };
