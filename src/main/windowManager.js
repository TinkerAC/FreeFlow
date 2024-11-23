// windowManager.js
import {BrowserWindow} from 'electron';
import path from 'path';
import {fileURLToPath} from 'url';
import {setupIpcHandlers} from './ipcHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow(db, store) {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
        },
    });

    console.log('加载主窗口, File:', path.join(__dirname, '..', 'index.html'));
    mainWindow.loadFile(path.join(__dirname, '..', 'index.html')).then(r => console.log('加载主窗口成功'));

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // 初始化 IPC 事件处理
    setupIpcHandlers(mainWindow,db,store);

    // 窗口事件处理
    mainWindow.on('close', (event) => {
        // 在这里处理窗口关闭事件
    });

    mainWindow.on('hide', () => {
        console.log('窗口已隐藏');
    });

    mainWindow.on('show', () => {
        console.log('窗口已显示');
    });

    return mainWindow;
}

export {createWindow, mainWindow};
