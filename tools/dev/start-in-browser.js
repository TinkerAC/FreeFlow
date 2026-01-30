// Starts the dev environment and opens the renderer in your browser
// - Spawns `pnpm start` (electron-forge + webpack dev server on port 3000)
// - Waits until http://localhost:3000/app_window is reachable
// - Opens the default browser to that URL

const { spawn } = require('child_process');
const http = require('http');
const os = require('os');

const RENDERER_URL = process.env.RENDERER_URL || 'http://localhost:3000/app_window';

function openBrowser(url) {
  const platform = os.platform();
  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true });
  } else if (platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore', detached: true });
  } else {
    spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
  }
}

function waitForUrl(url, { timeoutMs = 120000, intervalMs = 500 } = {}) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        // Any HTTP response indicates the server is up
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('Timed out waiting for dev server'));
        setTimeout(tryOnce, intervalMs);
      });
      req.setTimeout(2000, () => req.destroy(new Error('timeout')));
    };
    tryOnce();
  });
}

// 1) Start dev (electron-forge start)
// Use a shell to be robust across Windows (.cmd) and terminals
const child = spawn('pnpm start', {
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' },
});

// Forward exit
child.on('exit', (code) => process.exit(code ?? 0));

// 2) Wait for renderer dev server, then open browser
waitForUrl(RENDERER_URL)
  .then(() => {
    console.log(`Opening browser: ${RENDERER_URL}`);
    openBrowser(RENDERER_URL);
  })
  .catch((e) => {
    console.warn(`Could not detect dev server: ${e.message}`);
  });
