const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electron', {
    minimize: () => ipcRenderer.send('window-controls', 'minimize'),
    maximize: () => ipcRenderer.send('window-controls', 'maximize'),
    close: () => ipcRenderer.send('window-controls', 'close'),

    createPlaylist: () => {
        ipcRenderer.send('create-playlists');
    },

    //读取本地音乐库(全部音乐信息)
    getLocalLibrary: () => {
        return ipcRenderer.invoke('get-local-library');
    },
    //读取歌单
    getPlaylists: () => {
        return ipcRenderer.invoke('get-playlists');
    },

    //当主进程请求播放器状态时，发送播放器状态
    sendPlayerState: (state) => {
        ipcRenderer.send('send-player-state', state);
    },
    onRequestPlayerState: (callback) => {
        ipcRenderer.on('request-player-state', (event) => {
            callback(event);
        });
    },


    //向歌单添加音乐
    addTrackToLibrary: (track, refreshPlaylists) => {
        const tk = {
            "data_href": track.data_href,
            "file_path": track.file_path,
        }
        ipcRenderer.invoke('add-track-to-library', tk).then(() => {
            refreshPlaylists();
        });
    },


});

contextBridge.exposeInMainWorld('playerAPI', {
    getPlayerState: () => ipcRenderer.invoke('player-state'),
    getTrackInfo: (file_path, data_hraf) => ipcRenderer.invoke('get-track-info', file_path, data_hraf),

});


contextBridge.exposeInMainWorld('networkAPI', {
    getSearchResults: (term) => ipcRenderer.invoke('get-search-results', term),
    getMusicLink: (dataHref) => ipcRenderer.invoke('get-music-link', dataHref),
});

