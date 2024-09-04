import fs from 'fs';

function loadPlayer() {
    try {
        const playerData = fs.readFileSync('./data/playerState.json', 'utf-8');
        return JSON.parse(playerData);
    } catch (e) {
        console.error('Failed to load player state:', e);
        return null;  // 确保在失败时返回一个可处理的值
    }
}

export default loadPlayer;
