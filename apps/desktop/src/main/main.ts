import { app, BrowserWindow, ipcMain } from 'electron';
import type { WindowManager } from '@main/window/windowManager';
import type ShortCutManager from '@main/core/ShortCutManager';
import type ProxyServerManager from '@main/core/AudioProxyServer';
import type LocalLibraryService from '@main/services/localLibraryService';
import type IpcController from '@main/core/ipc/IpcController';
import type TrayManager from '@main/core/TrayManager';
import ProfileGuideWindow from '@main/window/ProfileGuideWindow';
import { markQuitting } from '@main/window/quitState';
import { registerProfileHandlers } from '@main/core/ipc/handlers/profileHandlers';
import { ensureRootDataPath, root_Data_Path } from '@main/core/rootDataPath';
import type { ProfileSummary } from '@src/shared/profile/profile';
import { Channels } from '@src/shared/ipc/channels';
import chalk from 'chalk';
import rootLogger, { IS_DEVELOPMENT } from '@src/utils/logger';

const logger = rootLogger.child({ context: 'Main' });

let guideWindow: ProfileGuideWindow | null = null;
let windowManager: WindowManager | null = null;
let windowKeys: typeof import('@main/window/windowManager').WindowKey | null = null;
let shortcutManager: ShortCutManager | null = null;
let mainLaunch: Promise<void> | null = null;
let mainApplicationLoaded = false;
let activeProfileId: string | null = null;

process.on('uncaughtException', (e) => logger.error('UncaughtException:', e));
process.on('unhandledRejection', (e) => logger.error('UnhandledRejection:', e));

function registerBootstrapWindowControls(): void {
  ipcMain.on(Channels.Window.Controls, (event, action: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;

    switch (action) {
      case 'minimize':
        win.minimize();
        break;
      case 'maximize':
        win.isMaximized() ? win.unmaximize() : win.maximize();
        break;
      case 'close':
        win.close();
        break;
      default:
        logger.warn(`Unknown window action: ${action}`);
    }
  });
}

function showProfileGuide(): void {
  if (!app.isReady()) return;

  if (!guideWindow || guideWindow.isDestroyed()) {
    guideWindow = new ProfileGuideWindow();
    guideWindow.on('closed', () => {
      guideWindow = null;
      if (mainApplicationLoaded && windowManager && windowKeys) {
        windowManager.activate(windowKeys.MAIN);
      }
    });
    return;
  }

  if (guideWindow.isMinimized()) guideWindow.restore();
  guideWindow.show();
  guideWindow.focus();
}

function closeProfileGuide(): void {
  if (!guideWindow || guideWindow.isDestroyed()) return;
  guideWindow.destroy();
  guideWindow = null;
}

function relaunchToProfileGuide(): void {
  logger.info('Relaunching application for Profile data source switch');
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 10);
}

function returnToProfileGuide(): void {
  logger.info('Returning to Profile guide');

  if (windowManager && windowKeys) {
    windowManager.hide(windowKeys.CREATORS_WORKSHOP);
    windowManager.hide(windowKeys.MINI);
    windowManager.hide(windowKeys.MAIN);
  }

  showProfileGuide();
}

async function launchMainApplication(profile: ProfileSummary): Promise<void> {
  if (mainApplicationLoaded) {
    if (profile.id === activeProfileId) {
      closeProfileGuide();
      windowManager?.activate(windowKeys!.MAIN);
      return;
    }

    relaunchToProfileGuide();
    return;
  }

  if (mainLaunch) {
    await mainLaunch;
    return;
  }

  mainLaunch = (async () => {
    logger.info(`Loading profile ${profile.id}`);
    activeProfileId = profile.id;

    const [
      windowModule,
      diModule,
      symbolModule,
      databaseModule,
      menuModule,
      helperModule,
      sessionModule,
    ] = await Promise.all([
      import('@main/window/windowManager'),
      import('@main/di/di-container'),
      import('@main/di/symbol'),
      import('@main/database/seqimpl'),
      import('@main/core/menu/Menu'),
      import('@src/utils/helpers'),
      import('@main/database/seqimpl/Session'),
    ]);

    windowKeys = windowModule.WindowKey;
    const { container } = diModule;
    const { DISymbol } = symbolModule;
    const { sequelize } = databaseModule;
    const { setAppMenu } = menuModule;
    const { getOperatingSystem } = helperModule;
    const { Session } = sessionModule;

    const localLibraryService = container.get<LocalLibraryService>(DISymbol.LocalLibraryService);
    const proxyServerManager = container.get<ProxyServerManager>(DISymbol.ProxyServerManager);
    const ipcController = container.get<IpcController>(DISymbol.IpcController);
    const trayManager = container.get<TrayManager>(DISymbol.TrayManager);
    shortcutManager = container.get<ShortCutManager>(DISymbol.ShortcutManager);
    windowManager = container.get<WindowManager>(DISymbol.WindowManager);

    setAppMenu();
    await sequelize.sync();
    await localLibraryService.updateLocalLibrary();
    await proxyServerManager.start();

    ipcController.register();
    windowManager.activate(windowKeys.MAIN);
    windowManager.ensure(windowKeys.WORKER);
    closeProfileGuide();

    trayManager.createTray();
    shortcutManager.register();
    mainApplicationLoaded = true;

    const startAt = new Date();
    Session.create({
      start_at: startAt,
      operating_system: getOperatingSystem(),
      app_version: app.getVersion(),
    }).then(() => {
      logger.info(
        chalk.green(
          `启动信息记录成功: ${startAt.toISOString()} ${getOperatingSystem()} ${app.getVersion()}`,
        ),
      );
    }).catch((error: unknown) => {
      logger.error('记录启动信息失败', error);
    });
  })().catch((error: unknown) => {
    mainLaunch = null;
    logger.error('startup failed', error);
    showProfileGuide();
    throw error;
  });

  await mainLaunch;
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock && !IS_DEVELOPMENT) {
  logger.info('Another instance is already running, quitting...');
  app.quit();
} else {
  logger.info('App started');
  registerBootstrapWindowControls();

  app.on('second-instance', () => {
    if (!windowManager || !windowKeys) {
      showProfileGuide();
      return;
    }

    if (windowManager.isVisible(windowKeys.MINI)) {
      windowManager.activate(windowKeys.MINI);
      return;
    }

    windowManager.activate(windowKeys.MAIN);
  });

  app.on('web-contents-created', (_e, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (ev, url) => {
      if (!url.startsWith('file://') && !url.startsWith('app://')) ev.preventDefault();
    });
  });

  app.whenReady().then(() => {
    ensureRootDataPath();
    registerProfileHandlers({
      rootDataPath: root_Data_Path,
      onEnterProfile: launchMainApplication,
      onExitToGuide: returnToProfileGuide,
    });
    showProfileGuide();
  }).catch((error: unknown) => {
    logger.error('startup failed', error);
    app.quit();
  });

  app.on('activate', () => {
    if (!windowManager || !windowKeys) {
      showProfileGuide();
      return;
    }

    if (windowManager.isVisible(windowKeys.MINI)) {
      windowManager.activate(windowKeys.MINI);
      return;
    }

    windowManager.activate(windowKeys.MAIN);
  });

  app.on('window-all-closed', () => {
    logger.info(`window-all-closed mainLoaded=${mainApplicationLoaded} platform=${process.platform}`);
    if (!mainApplicationLoaded || process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    logger.info('before-quit');
    markQuitting();
  });

  app.on('will-quit', () => {
    shortcutManager?.unregister();
    windowManager?.shutdown();
  });
}
