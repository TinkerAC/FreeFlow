import {app, BrowserWindow, ipcMain, Tray, Menu} from 'electron';
import path from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';
import {
    extractMusicMeta,
    generateNewPlaylistNumber,
    getPlaylists,
    parseTrackInfo,
} from '../services/playlistService.js';
import loadPlayer from '../services/playerService.js';
import {updateLocalLibrary} from '../services/localLibraryService.js';
import {
    getMusicInfo,
    getMusicLink,
    getSearchResults,
} from '../services/hifiniMusicService.js';
import {addTrackToLibrary} from "../services/playlistService.js";

// 获取当前文件的目录名
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('当前文件目录:', __dirname);

let mainWindow;
let tray = null; // 用于存储托盘实例
let isQuitting = false; // 标志位，标识应用是否退出

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        frame: false, // 无边框窗口
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
        },
    });

    mainWindow.loadFile('src/index.html');
    mainWindow.webContents.openDevTools();

    // 监听窗口控制事件
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
                mainWindow.hide(); // 隐藏窗口而不是关闭
                break;
            default:
                console.error('Unknown action:', action);
        }
    });

    // 监听创建歌单事件
    ipcMain.on('create-playlists', (event) => {
        const newNumber = generateNewPlaylistNumber();

        // 创建歌单
        const playlistTemplate = {
            imgSrc: 'https://placehold.co/50x50',
            title: `未命名歌单 #${newNumber}`,
            creater: '未知',
            createdAt: new Date().toISOString(),
            type: '歌单',
            songs: [],
        };

        const playlistDir = path.join(__dirname, 'data', 'playlists');

        // 确保目录存在
        if (!fs.existsSync(playlistDir)) {
            fs.mkdirSync(playlistDir, {recursive: true});
        }

        fs.writeFileSync(
            path.join(playlistDir, `#${newNumber}.json`),
            JSON.stringify(playlistTemplate, null, 2),
            'utf-8'
        );

        event.reply('create-playlists-reply', {status: 'success', message: '歌单创建成功'});
    });

    // 监听获取歌单事件
    ipcMain.handle('get-playlists', () => {
        return getPlaylists();
    });

    // 监听获取播放状态事件
    ipcMain.handle('player-state', () => {
        return loadPlayer();
    });

    // 监听获取曲目信息事件
    ipcMain.handle('get-track-info', async (event, file_path, data_href) => {
        try {
            if (file_path) {
                const metaData = await extractMusicMeta(file_path);
                return parseTrackInfo(metaData);
            } else if (data_href) {
                return await getMusicInfo(data_href);
            } else {
                console.error('Error in get-track-info: no file_path or data_href provided');
            }
        } catch (error) {
            console.error('Error in get-track-info:', error);
            throw error;
        }
    });

    // 监听网络搜索音乐事件
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

    // 监听解析音乐信息事件
    ipcMain.handle('get-music-link', async (event, dataHref) => {
        try {
            return await getMusicLink(dataHref);
        } catch (error) {
            console.error('Error in get-music-link:', error);
            throw error;
        }
    });

    // 监听向歌单添加网络音乐事件
    ipcMain.handle('add-track-to-library', (event, track) => {
        const tk = {
            "data_href": track.data_href,
            "file_path": track.file_path,
            "added_at": new Date().toISOString(),
        }
        addTrackToLibrary(tk);
    });

    // 窗口关闭时最小化到托盘
    mainWindow.on('close', (event) => {
        if (isQuitting) {
            // 如果已经在退出过程中，允许窗口关闭
            return;
        }

        event.preventDefault(); // 阻止默认关闭行为
        mainWindow.hide(); // 隐藏窗口到托盘
    });

    // 窗口关闭后清除引用
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 创建托盘图标及菜单
function createTray() {
    const trayIconPath = path.join(__dirname, '../assets/icon.jpg');

    tray = new Tray(trayIconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示窗口',
            click: () => {
                mainWindow.show();
            }
        },
        {
            label: '退出',
            click: () => {
                isQuitting = true;
                app.quit(); // 退出应用
            }
        }
    ]);

    tray.setToolTip('你的应用名称');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray(); // 创建托盘图标
    updateLocalLibrary(); // 在应用准备好后更新本地音乐库
});

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
