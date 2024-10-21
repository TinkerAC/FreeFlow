// shortcutManager.js
import {globalShortcut} from 'electron';


function registerGlobalShortcuts(mainWindow) {

    //需要发送的快捷键
    const shortcuts = [
        {
            key: 'Control+Alt+Left',
            action: 'prev',
        },
        {
            key: 'Control+Alt+Right',
            action: 'next',
        },
        {
            key: 'Control+Alt+P',
            action: 'play-pause',
        },
        {
            key: 'Control+Alt+Up',
            action: 'volume-up',
        },
        {
            key: 'Control+Alt+Down',
            action: 'volume-down',
        },
        {
            key: 'Control+Alt+F12',
            action: 'toggle-dev-tools',
        }
    ];

    shortcuts.forEach(({key, action}) => {
        const ret = globalShortcut.register(key, () => {
            console.log(`${key} 按下`);
            mainWindow.webContents.send('global-shortcut', action);
        });

        if (!ret) {
            console.log(`注册 ${key} 快捷键失败`);
        }
    });


}

function unregisterGlobalShortcuts() {
    globalShortcut.unregisterAll();
    console.log('所有全局快捷键已注销');
}

export {registerGlobalShortcuts, unregisterGlobalShortcuts};
