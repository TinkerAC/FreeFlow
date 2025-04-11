// src/main/models/index.ts

import { sequelize } from './database';
import { Track } from './Track';
import { Playlist } from './Playlist';
import { PlaylistDetail } from './PlaylistDetail';

// 定义模型之间的关联关系
Track.belongsTo(PlaylistDetail, { foreignKey: 'id', targetKey: 'track_id' });

PlaylistDetail.belongsTo(Playlist, {
  foreignKey: 'playlist_id',
  as: 'Playlist',
});


// 导出模型和 sequelize 实例
export { sequelize, Track, Playlist, PlaylistDetail };
