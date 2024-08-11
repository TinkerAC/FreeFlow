const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electron', {
    minimize: () => ipcRenderer.send('window-controls', 'minimize'),
    maximize: () => ipcRenderer.send('window-controls', 'maximize'),
    close: () => ipcRenderer.send('window-controls', 'close'),

    //播放音乐
    playMusic: (filePath) => {
        const audioBuffer = fs.readFileSync(filePath);
        const blob = new Blob([audioBuffer], { type: 'audio/mp3' }); // 根据文件类型修改 MIME 类型
        const audioURL = URL.createObjectURL(blob);
        const audio = new Audio(audioURL);
        audio.play();
    },
    //创建歌单
    createPlaylist: () => {
        ipcRenderer.send('create-playlists');
    },
    //读取歌单
    getPlaylists: () => {
        return ipcRenderer.invoke('get-playlists');
    },

});

