import { app, BrowserWindow, BrowserWindowConstructorOptions, ipcMain, session } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { IpcContext } from './ipcContext';

export function registerYouTubeMusicHandlers({ configService }: IpcContext): void {
  let youtubeLoginWindow: BrowserWindow | null = null;
  const youtubeLoginPopups = new Set<BrowserWindow>();

  const googleAccountLoginUrl = 'https://accounts.google.com/ServiceLogin?ltmpl=music&service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Faction_handle_signin%3Dtrue%26next%3Dhttps%253A%252F%252Fmusic.youtube.com%252F';

  type ExtendedWebPreferences = Electron.WebPreferences & { nativeWindowOpen?: boolean };

  const openYouTubeLoginWindow = async () => {
    if (youtubeLoginWindow && !youtubeLoginWindow.isDestroyed()) {
      youtubeLoginWindow.show();
      youtubeLoginWindow.focus();
      return;
    }

    const webPreferences: ExtendedWebPreferences = {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:youtube-music-login',
      nativeWindowOpen: true,
    };

    const loginWindow = new BrowserWindow({
      width: 1100,
      height: 720,
      title: 'YouTube Music 登录',
      autoHideMenuBar: true,
      webPreferences,
    });

    youtubeLoginWindow = loginWindow;
    loginWindow.on('closed', () => {
      youtubeLoginWindow = null;
      for (const popup of youtubeLoginPopups) {
        if (!popup.isDestroyed()) popup.close();
      }
      youtubeLoginPopups.clear();
    });

    loginWindow.webContents.setWindowOpenHandler(() => ({ action: 'allow' }));

    const chromeUA = process.platform === 'darwin'
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.152 Safari/537.36'
      : process.platform === 'win32'
        ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.152 Safari/537.36'
        : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.152 Safari/537.36';
    loginWindow.webContents.userAgent = chromeUA;
    app.userAgentFallback = chromeUA;

    const ses = loginWindow.webContents.session;
    ses.webRequest.onBeforeSendHeaders((details, cb): void => {
      const host = (() => {
        try {
          return new URL(details.url).hostname;
        } catch {
          return '';
        }
      })();
      if (host.endsWith('youtube.com') || host.endsWith('google.com')) {
        details.requestHeaders['User-Agent'] = chromeUA;
      }
      cb({ requestHeaders: details.requestHeaders });
    });

    loginWindow.webContents.on('did-create-window', (child) => {
      try {
        youtubeLoginPopups.add(child);
        child.on('closed', () => youtubeLoginPopups.delete(child));
        child.webContents.userAgent = chromeUA;
        child.webContents.session.webRequest.onBeforeSendHeaders((details, cb): void => {
          const host = (() => {
            try {
              return new URL(details.url).hostname;
            } catch {
              return '';
            }
          })();
          if (host.endsWith('youtube.com') || host.endsWith('google.com')) {
            details.requestHeaders['User-Agent'] = chromeUA;
          }
          cb({ requestHeaders: details.requestHeaders });
        });

        child.webContents.setWindowOpenHandler((): Electron.WindowOpenHandlerResponse => {
          const overrideBrowserWindowOptions: BrowserWindowConstructorOptions = {
            parent: child,
            autoHideMenuBar: true,
            width: 1100,
            height: 720,
            show: true,
            webPreferences: {
              partition: 'persist:youtube-music-login',
              nodeIntegration: false,
              contextIsolation: true,
              nativeWindowOpen: true,
            } as ExtendedWebPreferences,
          };

          return {
            action: 'allow',
            overrideBrowserWindowOptions,
          };
        });

        child.once('ready-to-show', () => {
          if (!child.isDestroyed()) child.show();
        });
      } catch {
        // ignore
      }
    });

    const redirectToGoogleLogin = () => {
      if (loginWindow.isDestroyed()) return;
      loginWindow.webContents.loadURL(googleAccountLoginUrl).catch((): void => void 0);
    };

    const ensureGoogleLogin = (url: string, event?: Electron.Event) => {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith('youtube.com')) return false;
        if (parsed.pathname !== '/premium') return false;
      } catch {
        return false;
      }
      event?.preventDefault?.();
      redirectToGoogleLogin();
      return true;
    };

    loginWindow.webContents.on('will-redirect', (event, url) => {
      ensureGoogleLogin(url, event);
    });
    loginWindow.webContents.on('will-navigate', (event, url) => {
      ensureGoogleLogin(url, event);
    });
    loginWindow.webContents.on('did-navigate', (_event, url) => {
      ensureGoogleLogin(url);
    });
    loginWindow.webContents.on('did-navigate-in-page', (_event, url) => {
      ensureGoogleLogin(url);
    });

    try {
      await loginWindow.loadURL('https://music.youtube.com/');
    } catch (error) {
      console.error('[YouTubeMusic] 登录窗口加载失败:', error);
      throw error;
    }
  };

  const closeYouTubeLoginWindow = async () => {
    if (youtubeLoginWindow && !youtubeLoginWindow.isDestroyed()) {
      youtubeLoginWindow.close();
    }
  };

  const syncYouTubeMusicCredentials = async (): Promise<{ cookie: string; visitorData: string }> => {
    const partition = 'persist:youtube-music-login';
    const loginWindow = youtubeLoginWindow;
    const targetSession = loginWindow?.webContents.session ?? session.fromPartition(partition);

    const collectCookies = async () => {
      const aggregates: Electron.Cookie[] = [];
      try {
        aggregates.push(...await targetSession.cookies.get({ url: 'https://music.youtube.com' }));
      } catch {
      }
      try {
        aggregates.push(...await targetSession.cookies.get({ domain: '.youtube.com' }));
      } catch {
      }

      const map = new Map<string, string>();
      for (const entry of aggregates) {
        if (!entry?.name) continue;
        map.set(entry.name, entry.value ?? '');
      }
      return Array.from(map.entries())
        .filter(([name]) => !!name)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
    };

    const cookie = await collectCookies();

    let visitorData = '';
    if (loginWindow && !loginWindow.isDestroyed()) {
      try {
        visitorData = await loginWindow.webContents.executeJavaScript(
          'window.ytcfg?.get?.(\'VISITOR_DATA\') ?? \'\'',
          true,
        );
      } catch (error) {
        console.warn('[YouTubeMusic] 提取 VISITOR_DATA 失败:', error);
      }
    }

    if (!visitorData) {
      try {
        const infoCookie = await targetSession.cookies.get({ name: 'VISITOR_INFO1_LIVE' });
        visitorData = infoCookie?.[0]?.value ?? '';
      } catch {
      }
    }

    configService.setByPath('services.youtubeMusic.cookie', cookie ?? '');
    configService.setByPath('services.youtubeMusic.visitorData', visitorData ?? '');

    return {
      cookie: cookie ?? '',
      visitorData: visitorData ?? '',
    };
  };

  ipcMain.handle(Channels.YouTubeMusic.OpenLogin, async () => {
    await openYouTubeLoginWindow();
  });

  ipcMain.handle(Channels.YouTubeMusic.SyncCredentials, async () => {
    return await syncYouTubeMusicCredentials();
  });

  ipcMain.handle(Channels.YouTubeMusic.CloseLogin, async () => {
    await closeYouTubeLoginWindow();
  });
}
