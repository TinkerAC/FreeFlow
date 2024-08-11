const fs = require('fs');



function getPlaylists() {
    const playlists = fs.readdirSync('./data/playlists');
    return playlists.map(playlist => {
        const data = fs.readFileSync(`./data/playlists/${playlist}`, 'utf-8');
        return JSON.parse(data);
    });// 返回歌单列表
}

function generateNewPlaylistNumber() {
    const nameList = fs.readdirSync('./data/playlists');
    let maxNum = 0;

    nameList.forEach(name => {
        // 假设歌单文件名格式为 "#1.json", "#2.json" 等
        const match = name.match(/^#(\d+)\.json$/);
        if (match) {
            const num = parseInt(match[1], 10); // 提取编号并转换为整数
            if (num > maxNum) {
                maxNum = num; // 更新最大的编号
            }
        }
    });

    // 新编号应该是当前最大编号 +1
    return maxNum + 1; // 返回新歌单的编号
}

module.exports = {
    getPlaylists,
    generateNewPlaylistNumber
};

