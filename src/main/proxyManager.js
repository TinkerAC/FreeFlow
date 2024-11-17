// proxyManager.js
import {spawn} from 'child_process';
import path from 'path';
import {isPortOccupied} from '../utils/netUtils.js';
import {dataPath} from './pathConfig.js';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let proxyProcess = null;

async function startProxyProcess(
    store_cwd
) {
    const isOccupied = await isPortOccupied(3000);
    if (isOccupied) {
        console.error('端口 3000 已被占用');
        return;
    }
    proxyProcess = spawn(process.execPath, [path.join(__dirname, '..', 'proxy.js')], {
        env: {...process.env, DATA_PATH: dataPath, STORE_CWD: store_cwd},
        stdio: 'inherit',
    });

    proxyProcess.on('exit', (code) => {
        console.log(`代理进程已退出，退出码 ${code}`);
        proxyProcess = null;
    });

    console.log('代理进程已启动');
}

function stopProxyProcess() {
    if (proxyProcess) {
        proxyProcess.kill();
        proxyProcess = null;
        console.log('代理进程已停止');
    }
}

export {startProxyProcess, stopProxyProcess};
