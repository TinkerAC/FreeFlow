const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electron', {
    minimize: () => ipcRenderer.send('window-controls', 'minimize'),
    maximize: () => ipcRenderer.send('window-controls', 'maximize'),
    close: () => ipcRenderer.send('window-controls', 'close'),

    createPlaylist: () => {
        ipcRenderer.send('create-playlists');
    },
    //读取歌单
    getPlaylists: () => {
        return ipcRenderer.invoke('get-playlists');
    },

});


contextBridge.exposeInMainWorld('playerAPI', {
    getPlayerState: () => ipcRenderer.invoke('player-state'),
    getMusicMetaInfo: (filePath) => ipcRenderer.invoke('get-music-meta', filePath),

});

