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

let mainWindow;   // 主窗口
let tray = null;  // 系统托盘图标
let isQuitting = false; // 标志位，标识应用是否正在退出

// 创建主窗口的函数
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        frame: false, // 无边框窗口
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // 预加载脚本
            contextIsolation: true, // 上下文隔离
            enableRemoteModule: false, // 禁用远程模块
        },
    });

    mainWindow.loadFile('src/index.html'); // 加载主界面 HTML 文件
    mainWindow.webContents.openDevTools(); // 打开开发者工具

    // 监听窗口控制事件（最小化、最大化、关闭）
    ipcMain.on('window-controls', (event, action) => {
        switch (action) {
            case 'minimize':
                mainWindow.minimize(); // 最小化窗口
                break;
            case 'maximize':
                if (mainWindow.isMaximized()) {
                    mainWindow.unmaximize(); // 还原窗口
                } else {
                    mainWindow.maximize(); // 最大化窗口
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

        // 创建歌单模板
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

        // 将歌单保存为 JSON 文件
        fs.writeFileSync(
            path.join(playlistDir, `#${newNumber}.json`),
            JSON.stringify(playlistTemplate, null, 2),
            'utf-8'
        );

        // 回复创建成功的消息
        event.reply('create-playlists-reply', {status: 'success', message: '歌单创建成功'});
    });

    // 监听获取歌单事件
    ipcMain.handle('get-playlists', () => {
        return getPlaylists();
    });

    // 监听获取播放器状态事件
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

    // 监听解析音乐链接事件
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
        };
        addTrackToLibrary(tk);
    });

    // 监听窗口的关闭事件，隐藏窗口而不是退出应用
    mainWindow.on('close', (event) => {
        if (isQuitting) {
            // 如果已经在退出过程中，允许窗口关闭
            mainWindow = null; // 清除引用
        } else {
            event.preventDefault(); // 阻止默认关闭行为
            mainWindow.hide(); // 隐藏窗口到托盘
        }
    });

    // 监听窗口被隐藏事件
    mainWindow.on('hide', () => {
        console.log('窗口已隐藏');
    });

    // 监听窗口被显示事件
    mainWindow.on('show', () => {
        console.log('窗口已显示');
    });
}

// 创建系统托盘图标及菜单
function createTray() {
    const trayIconPath = path.join(__dirname, '..', '..', 'assets', 'icon.jpg');
    try {
        tray = new Tray(trayIconPath); // 创建托盘图标

        const contextMenu = Menu.buildFromTemplate([
            {
                label: '显示窗口',
                click: () => {
                    mainWindow.show(); // 显示主窗口
                }
            },
            {
                label: '退出',
                click: () => {
                    isQuitting = true; // 设置退出标志位
                    app.quit(); // 退出应用
                }
            }
        ]);

        tray.setToolTip('你的应用名称'); // 设置托盘悬停提示
        tray.setContextMenu(contextMenu); // 设置托盘右键菜单

        // 点击托盘图标时，显示主窗口
        tray.on('click', () => {
            mainWindow.show();
        });

        console.log('系统托盘已创建');

    }catch (e){
        console.log("创建托盘时出错",e);
    }
}

// 应用准备就绪时调用
app.whenReady().then(() => {
    createWindow();    // 创建主窗口
    createTray();      // 创建系统托盘
    updateLocalLibrary(); // 更新本地音乐库
});

// 移除 'window-all-closed' 事件监听器，防止应用在所有窗口关闭后退出
// 如果您需要在 macOS 上有特殊处理，可以在这里添加代码
// app.on('window-all-closed', () => {
//     // 不执行任何操作，防止应用退出
// });

// 当应用被激活（如单击 Dock 图标）时，重新创建窗口
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// 当应用即将退出时，清理资源
app.on('before-quit', () => {
    isQuitting = true; // 设置退出标志位，防止 'close' 事件中阻止退出
    if (tray) tray.destroy(); // 销毁托盘图标
});
