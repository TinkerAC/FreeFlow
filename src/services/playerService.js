import fs from 'fs';

function loadPlayer() {
    try {
        const playerData = fs.readFileSync('./data/playerState.json', 'utf-8');
        return JSON.parse(playerData);
    } catch (e) {
        console.error('加载播放器状态时出错:', e);
        return {
        }
    }
}

function savePlayer(playerState) {
    fs.writeFileSync('./data/playerState.json', JSON.stringify(playerState, null, 2), 'utf-8');
}


export {loadPlayer,savePlayer};
