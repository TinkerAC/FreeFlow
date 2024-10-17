// trayManager.js
import {Tray, Menu, app} from 'electron';
import path from 'path';
import {fileURLToPath} from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __filename = fileURLToPath(import.meta.url);


let tray = null;

function createTray(mainWindow) {
    const trayIconPath = path.join(__dirname, '..', '..', 'assets', 'icon.jpg');
    tray = new Tray(trayIconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示窗口',
            click: () => {
                mainWindow.show();
            },
        },
        {
            label: '退出',
            click: () => {
                app.quit();
            },
        },
    ]);

    tray.setToolTip('你的应用名称');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
    });

    console.log('系统托盘已创建');
}

export {createTray, tray};
