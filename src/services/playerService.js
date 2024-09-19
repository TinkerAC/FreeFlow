import fs from 'fs';

function loadPlayer() {
    try {
        const playerData = fs.readFileSync('./data/playerState.json', 'utf-8');
        return JSON.parse(playerData);
    } catch (e) {
        console.error('加载播放器状态时出错:', e);
        return {};
    }
}

export default loadPlayer;
