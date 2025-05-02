import fs from 'fs';
import { PlayerState } from '@src/shared/types';

function loadPlayer(playerStateDumpFile: string) {
  try {
    const playerData = fs.readFileSync(playerStateDumpFile, 'utf-8');
    return JSON.parse(playerData);
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn('未找到播放器状态文件:', playerStateDumpFile);
    }
    return {};
  }
}

function savePlayer(playerStateDumpFile: string
  , playerState: PlayerState,
) {

  try {
    console.log('Player 转储文件: ', playerStateDumpFile);
    fs.writeFileSync(playerStateDumpFile, JSON.stringify(playerState), 'utf-8');
    console.log('播放器状态已保存:', playerState);
  } catch (e) {
    console.warn('播放器状态未能保存:', playerState);
    console.error('保存播放器状态时出错:', e);
  }
}

export { loadPlayer, savePlayer };
