import * as net from 'node:net';
/**
 * 获取当前平台的最佳服务器节点
 * @param hosts 服务器地址数组
 * @returns Promise<string>
 *   返回延迟最低的服务器地址
 */
import ping from 'ping';

function isPortOccupied(port: number, host = 'localhost') {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (err: { code: string; }) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // 端口被占用
      } else {
        reject(err); // 其他错误
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false); // 端口未被占用
    });

    server.listen(port, host);
  });
}

async function chooseBestServerNode(hosts: string[]) {
  let bestHost = '';
  let bestTime = Number.POSITIVE_INFINITY;

  for (const host of hosts) {
    try {
      const res = await ping.promise.probe(host, {
        timeout: 2,
        extra: ['-c', '3'],
      });
      console.log(`原始响应：`, res);
      // 确保 res.time 是有效数字字符串
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const time = parseFloat(res.time);
      console.log(`服务器 ${host} 的延迟：${time} ms`);
      if (!isNaN(time) && time < bestTime) {
        bestTime = time;
        bestHost = host;
      }
    } catch (err) {
      console.error(`Ping ${host} 时发生错误：`, err);
    }
  }

  console.log(`最佳服务器：${bestHost} 延迟约 ${bestTime} ms`);
  return bestHost;
}


export { isPortOccupied, chooseBestServerNode };
// // 使用示例
// const serverNodes = [
//   'neteasecloudmusicapi-pi-flax.vercel.core',
//   '47.97.185.179'
// ];
//
// chooseBestServerNode(serverNodes).then((bestNode) => {
//   console.log('选择的最佳服务器节点：', bestNode);
// });