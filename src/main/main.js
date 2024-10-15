import {app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray} from 'electron';
import path from 'path';
import {fileURLToPath} from 'url';

import {
    addTrackToLibrary,
    extractMusicMeta,
    creatNewEmptyPlaylist,
    getPlaylists,
    parseTrackInfo,
} from '../services/playlistService.js';
import {loadPlayer, savePlayer} from '../services/playerService.js';
import {updateLocalLibrary} from '../services/localLibraryService.js';
import {getMusicInfo, getMusicLink, getSearchResults} from '../services/hifiniMusicService.js';




// 获取当前文件的目录名
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('当前文件目录:', __dirname);

let mainWindow;   // 主窗口
let tray = null;  // 系统托盘图标
let isQuitting = false; // 标志位，标识应用是否正在退出

const environment = process.env.NODE_ENV

console.log('当前环境:', environment);
const dataPath = app.getPath('userData');




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
        try {
            creatNewEmptyPlaylist();
            event.reply('playlist-created');
        } catch (error) {
            console.error('Error in create-playlists:', error);
            event.reply('playlist-create-failed', error);
        }
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


    // 监听窗口的关闭事件，阻止默认关闭行为并请求播放器状态
    mainWindow.on('close', (event) => {
        if (isQuitting) {
            // 如果已经在退出过程中，允许窗口关闭
            mainWindow = null; // 清除引用
        } else {
            event.preventDefault(); // 阻止默认关闭行为
            // 发送消息请求渲染进程的播放器状态
            mainWindow.webContents.send('request-player-state');
            console.log('已向渲染进程请求播放器状态');
            // 在主进程中等待渲染进程的响应
            ipcMain.once('reply-player-state', (event, state) => {
                console.log('主进程已收到播放器状态:', state);
                savePlayer(state); // 保存播放器状态
                isQuitting = true; // 设置退出标志位，防止重复执行
                app.quit(); // 退出应用
            });
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

    } catch (e) {
        console.log("创建托盘时出错", e);
    }
}

// 注册全局快捷键
function registerGlobalShortcuts() {
    const ret1 = globalShortcut.register('Control+Alt+Left', () => {
        // 处理 Ctrl + Alt + 左箭头
        console.log('Ctrl + Alt + 左箭头 按下');
        mainWindow.webContents.send('global-shortcut', 'prev');
    });

    if (!ret1) {
        console.log('注册 Ctrl+Alt+Left 快捷键失败');
    }

    const ret2 = globalShortcut.register('Control+Alt+Right', () => {
        // 处理 Ctrl + Alt + 右箭头
        console.log('Ctrl + Alt + 右箭头 按下');
        mainWindow.webContents.send('global-shortcut', 'next');
    });

    if (!ret2) {
        console.log('注册 Ctrl+Alt+Right 快捷键失败');
    }

    const ret3 = globalShortcut.register('Control+Alt+P', () => {
        // 处理 Ctrl + Alt + P
        console.log('Ctrl + Alt + P 按下');
        mainWindow.webContents.send('global-shortcut', 'play-pause');
    });

    if (!ret3) {
        console.log('注册 Ctrl+Alt+P 快捷键失败');
    }

    // 调大音量
    const ret4 = globalShortcut.register('Control+Alt+Up', () => {
        // 处理 Ctrl + Alt + 上箭头
        console.log('Ctrl + Alt + 上箭头 按下');
        mainWindow.webContents.send('global-shortcut', 'volume-up');
    });
    if (!ret4) {
        console.log('注册 Ctrl+Alt+Up 快捷键失败');
    }

    // 调小音量
    const ret5 = globalShortcut.register('Control+Alt+Down', () => {
        // 处理 Ctrl + Alt + 下箭头
        console.log('Ctrl + Alt + 下箭头 按下');
        mainWindow.webContents.send('global-shortcut', 'volume-down');
    });

    if (!ret5) {
        console.log('注册 Ctrl+Alt+Down 快捷键失败');
    }
}

// 注销所有全局快捷键
function unregisterGlobalShortcuts() {
    globalShortcut.unregisterAll();
    console.log('所有全局快捷键已注销');
}


// 应用准备就绪时调用
app.whenReady().then(() => {
    createWindow();           // 创建主窗口
    createTray();             // 创建系统托盘
    registerGlobalShortcuts(); // 注册全局快捷键
    updateLocalLibrary();    // 更新本地音乐库

    // 在 macOS 上，激活应用时重新创建窗口
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 当应用即将退出时，清理资源
app.on('before-quit', () => {
    if (tray) tray.destroy(); // 销毁托盘图标
});

// 应用退出时注销全局快捷键
app.on('will-quit', () => {
    unregisterGlobalShortcuts(); // 注销所有全局快捷键
});
