import * as net from "node:net";


function isPortOccupied(port, host = 'localhost') {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.once('error', (err) => {
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


export {isPortOccupied};

// Usage:
// const port = 3000;
// isPortOccupied(port).then(console.log).catch(console.error);