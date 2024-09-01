import {app, BrowserWindow, ipcMain} from 'electron';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';
import {
    extractMusicMeta,
    generateNewPlaylistNumber,
    getPlaylists, parseTrackInfo
} from '../services/playlistService.js';
import {loadPlayer} from '../services/playerService.js';
import {updateLocalLibrary} from '../services/localLibraryService.js';
import {getSearchResults} from "../services/hifiniMusicService.js";
// 获取当前文件的目录名
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        frame: false,  // 无边框窗口
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
        }
    });


    mainWindow.loadFile('src/index.html');
    mainWindow.webContents.openDevTools();  // 打开 DevTools

    //监听窗口控制事件
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
                mainWindow.close();
                break;
            default:
                console.error('Unknown action:', action);
        }
    });
    //监听创建歌单事件
    ipcMain.on('create-playlists', (event) => {

        const newNumber = generateNewPlaylistNumber();
        //创建歌单
        const playlistTemplate = {
            imgSrc: "https://placehold.co/50x50",
            title: "未命名歌单 #" + newNumber,
            creater: "未知",
            createdAt: new Date().toISOString(),
            type: "歌单",
            songs: []
        };


        fs.writeFileSync(`data/playlists/#${newNumber}.json`, JSON.stringify(playlistTemplate, null, 2), 'utf-8');
        event.reply('create-playlists-reply', {status: 'success', message: '歌单创建成功'});
    });
    //监听获取歌单事件
    ipcMain.handle('get-playlists', () => {
        return getPlaylists();
    });


    //监听获取播放状态事件
    ipcMain.handle('player-state', () => {
        return loadPlayer();
    });

    //监听获取音乐封面事件
    ipcMain.handle('get-track-cover', async (event, filePath) => {
        const meta = await getMusicMetaInfo(filePath);
        return meta.common.base64Cover;
    });
    //
    ipcMain.handle('get-track-info', async (event, file_path) => {
        const metaData = await extractMusicMeta(file_path);
        return parseTrackInfo(metaData);
    });

    //监听网络搜索音乐事件
    ipcMain.handle('get-search-results', async (event, searchTerm) => {
        const results = await getSearchResults(searchTerm);
        console.log('搜索结果:', results);
        return results;
    });


    // 窗口关闭时清除引用
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}


//重新扫描本地音乐库并更新到library.json
updateLocalLibrary();

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
