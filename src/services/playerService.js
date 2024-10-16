import fs from 'fs';

function loadPlayer(playerStateDumpFile) {
    try {
        const playerData = fs.readFileSync(playerStateDumpFile, 'utf-8');
        return JSON.parse(playerData);
    } catch (e) {
        console.error('加载播放器状态时出错:', e);
        return {};
    }
}

function savePlayer(playerStateDumpFile, playerState) {
    fs.writeFileSync(playerStateDumpFile, JSON.stringify(playerState, null, 2), 'utf-8');
}

export {loadPlayer, savePlayer};
