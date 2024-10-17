// ipcHandlers.js
import {app, ipcMain} from 'electron';
import {
    addTrackToLibrary,
    extractMusicMeta,
    creatNewEmptyPlaylist,
    getPlaylists,
    parseTrackInfo,
} from '../services/playlistService.js';
import {loadPlayer, savePlayer} from '../services/playerService.js';
import {updateLocalLibrary} from '../services/localLibraryService.js';
import {
    getMusicInfo,
    getMusicLink,
    getSearchResults,
} from '../services/hifiniMusicService.js';
import {dataPath, playlistsDir, playerStateDumpFile, dbFile} from './pathConfig.js';

function setupIpcHandlers(mainWindow) {
    // 窗口控制事件
    ipcMain.on('window-controls', (event, action) => {
        switch (action) {
            case 'minimize':
                mainWindow.minimize();
                break;
            case 'maximize':
                if (mainWindow.isMaximized()) {
                    mainWindow.unmaximize();
                } else {
                    mainWindow.maximize();
                }
                break;
            case 'close':
                mainWindow.hide();
                break;
            default:
                console.error('Unknown action:', action);
        }
    });

    // 创建歌单事件
    ipcMain.on('create-playlists', (event) => {
        try {
            creatNewEmptyPlaylist();
            event.reply('playlist-created');
        } catch (error) {
            console.error('Error in create-playlists:', error);
            event.reply('playlist-create-failed', error);
        }
    });

    // 获取歌单事件
    ipcMain.handle('get-playlists', () => {
        return getPlaylists(playlistsDir);
    });

    // 获取播放器状态事件
    ipcMain.handle('player-state', () => {
        return loadPlayer(playerStateDumpFile);
    });

    // 获取曲目信息事件
    ipcMain.handle('get-track-info', async (event, file_path, data_href) => {
        try {
            if (file_path) {
                const metaData = await extractMusicMeta(file_path);
                return parseTrackInfo(metaData);
            } else if (data_href) {
                return await getMusicInfo(data_href, dbFile);
            } else {
                console.error('Error in get-track-info: no file_path or data_href provided');
            }
        } catch (error) {
            console.error('Error in get-track-info:', error);
            throw error;
        }
    });

    // 搜索音乐事件
    ipcMain.handle('get-search-results', async (event, searchTerm) => {
        try {
            const results = await getSearchResults(searchTerm);
            console.log('搜索结果:', results);
            return results;
        } catch (error) {
            console.error('Error in get-search-results:', error);
            throw error;
        }
    });

    // 解析音乐链接事件
    ipcMain.handle('get-music-link', async (event, dataHref) => {
        try {
            return await getMusicLink(dataHref);
        } catch (error) {
            console.error('Error in get-music-link:', error);
            throw error;
        }
    });

    // 添加音乐到歌单事件
    ipcMain.handle('add-track-to-library', (event, track) => {
        const tk = {
            data_href: track.data_href,
            file_path: track.file_path,
            added_at: new Date().toISOString(),
        };
        addTrackToLibrary(tk);
    });

    ipcMain.handle('get-user-data-path', async (event) => {
        return dataPath;
    });

    // 监听播放器状态请求
    ipcMain.once('reply-player-state', (event, state) => {
        console.log('主进程已收到播放器状态:', state);
        savePlayer(state);
        app.quit();
    });
}

export {setupIpcHandlers};
