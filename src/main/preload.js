const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
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


    // 监听主进程请求播放器状态事件
    onRequestPlayerState: (callback) => {
        const listener = () => {
            callback();
        };
        ipcRenderer.on('request-player-state', listener);

        // 返回移除监听器的函数
        return () => {
            ipcRenderer.removeListener('request-player-state', listener);
            console.log("主进程请求播放器状态事件监听已移除");
        };
    },

    //渲染进程收到主进程请求播放器状态事件后，向主进程发送播放器状态
    sendPlayerState: (state) => {
        ipcRenderer.send('reply-player-state', state);
        console.log("播放器状态已发送");
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

    // 监听 'global-shortcut' 事件
    onShortcut: (callback) => ipcRenderer.on('global-shortcut', (event, message) => {
        callback(message);
    }),
    // 移除 'global-shortcut' 事件监听
    removeShortcutListener: () => {
        ipcRenderer.removeAllListeners('global-shortcut');
        console.log("全局快捷键事件监听已移除");
    },

});


contextBridge.exposeInMainWorld('networkAPI', {
    getSearchResults: (term) => ipcRenderer.invoke('get-search-results', term),
    getMusicLink: (dataHref) => ipcRenderer.invoke('get-music-link', dataHref),
});

