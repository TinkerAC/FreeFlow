// proxyManager.js
import {fork} from 'child_process';
import path from 'path';
import {isPortOccupied} from '../utils/netUtils.js';
import {dataPath} from './pathConfig.js';
import {fileURLToPath} from "url";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

let proxyProcess = null;

async function startProxyProcess() {
    const isOccupied = await isPortOccupied(3000);
    if (isOccupied) {
        console.error('端口 3000 已被占用');
        return;
    }
    proxyProcess = fork(path.join(__dirname, '..', 'proxy.js'), [], {
        env: {...process.env, DATA_PATH: dataPath},
        stdio: 'inherit',
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
