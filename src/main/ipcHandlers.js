// ipcHandlers.js
import {app, ipcMain} from 'electron';
import {
    addTrackToPlaylist,
    creatNewEmptyPlaylist,
    extractMusicMeta,
    getPlaylists,
    modifyPlaylist,
    parseTrackInfo,
    removePlaylist,
    removeTrackFromPlaylist,
} from '../services/playlistService.js';
import {addTrackToLibrary, isTrackInLibrary} from '../services/libraryService.js';

import {loadPlayer, savePlayer} from '../services/playerService.js';
import {getMusicInfo, getMusicLink, getSearchResults,} from '../services/hifiniMusicService.js';
import {dataPath, playerStateDumpFile} from './pathConfig.js';
import {dbGet} from "../utils/dbUtils.js";


function setupIpcHandlers(mainWindow, db) {
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
    ipcMain.handle('create-playlists', async (event) => {
        try {
            await creatNewEmptyPlaylist(db, '新建歌单', '这是一个新建的歌单');

        } catch (error) {
            console.error('Error in create-playlists:', error);

        }
    });

    // 获取歌单事件
    ipcMain.handle('get-playlists', async (event) => {
        try {
            return await getPlaylists(db);
        } catch (error) {
            console.error('Error in get-playlists:', error);
            throw error;
        }
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
                return await getMusicInfo(data_href, db);
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
        console.log('后端收到搜索请求:', searchTerm);
        try {
            const results = await getSearchResults(searchTerm, db);
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

    // 添加音乐到库事件
    ipcMain.handle('add-track-to-library', async (event, track) => {
        const tk = {
            data_href: track.data_href,
            file_path: track.file_path,
        };


        const track_id = await isTrackInLibrary(tk, db);

        if (track_id) {
            console.log('待添加的音乐已在库中，track_id:', track_id);
            return track_id;
        }

        return addTrackToLibrary(tk, db);
    });

    // 添加音乐到歌单事件
    ipcMain.handle('add-track-to-playlist', async (event, track, playlistId) => {
        let trackId; // 用 let 以便后续赋值

        try {
            // 先检查歌曲是否在库中（假设 db.get 是异步的）
            const row = await dbGet(db, 'SELECT track_id FROM library WHERE data_href = ? OR file_path = ?', [track.data_href, track.file_path]);

            if (!row) {
                // 如果不在库中，先添加到库
                trackId = await addTrackToLibrary(track, db);
                const str = JSON.stringify(trackId);
                console.log(`待插入歌单歌曲不在库中，已添加到库，track_id: ${str}`);
            } else {
                trackId = row.track_id;
                console.log(`待插入歌单的歌曲已在库中，track_id: ${JSON.stringify(trackId)}`);
                console.log('row:', row);
            }

            // 添加到歌单
            await addTrackToPlaylist(db, playlistId, trackId);
            return trackId;

        } catch (error) {
            console.error('Error in add-track-to-playlist:', error);
            throw error;
        }
    });


    // 从歌单中删除音乐事件
    ipcMain.handle('remove-track-from-playlist', async (event, playlistId, trackId) => {
        try {
            await removeTrackFromPlaylist(db, playlistId, trackId);
        } catch (error) {
            console.error('Error in remove-track-from-playlist:', error);
            throw error;
        }
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


    // 修改歌单事件

    ipcMain.handle('modify-playlist', async (event, playlistId, playlist_title, playlist_description) => {
        try {
            // 修改歌单信息
            await modifyPlaylist(db, playlistId, playlist_title, playlist_description);
            return true;
        } catch (error) {
            console.error('Error in modify-playlist:', error);
            throw error;
        }
    });

    //删除歌单事件
    ipcMain.handle('remove-playlist', async (event, playlistId) => {
        try {
            await removePlaylist(db, playlistId);
            return true;
        } catch (error) {
            console.error('Error in remove-playlist:', error);
            throw error;
        }
    });
}

export {setupIpcHandlers};
