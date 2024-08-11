const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const fs = require("fs");
const {getPlaylists, generateNewPlaylistNumber} = require("../services/playlistService");
require('electron-reload')(__dirname)  // 引入并配置 electron-reload

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
        const playlists = getPlaylists();
        console.log('Playlists:', playlists); // 打印调试信息
        return playlists;
    });


    // 窗口关闭时清除引用
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

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
