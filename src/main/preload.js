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

});

contextBridge.exposeInMainWorld('playerAPI', {
    getPlayerState: () => ipcRenderer.invoke('player-state'),
    getTrackInfo: (file_path) => ipcRenderer.invoke('get-track-info', file_path)

});


contextBridge.exposeInMainWorld('networkAPI', {
    getSearchResults: (term) => ipcRenderer.invoke('get-search-results', term),
    getMusicLink: (dataHref) => ipcRenderer.invoke('get-music-link', dataHref),
});

