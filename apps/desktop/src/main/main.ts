import { app } from 'electron';
import { WindowKey, windowManager } from '@main/window/windowManager';
import type ShortCutManager from '@main/core/ShortCutManager';
import type ProxyServerManager from '@main/core/AudioProxyServer';
import type IpcController from '@main/core/ipc/IpcController';
import type TrayManager from '@main/core/TrayManager';
import { markQuitting } from '@main/window/quitState';
import { registerProfileHandlers } from '@main/core/ipc/handlers/bootstrap/profileHandlers';
import type { ProfileSummary } from '@src/shared/profile/profile';
import chalk from 'chalk';
import rootLogger, { IS_DEVELOPMENT } from '@src/utils/logger';
import { ensureRootDataPath, root_Data_Path } from '@main/core/PathConfig';
import { registerBootstrapWindowControls } from '@main/core/ipc/handlers/bootstrap/guideWindowControlHandlers';

const logger = rootLogger.child({ context: 'Main' });

let shortcutManager: ShortCutManager | null = null;
let mainLaunch: Promise<void> | null = null;
let mainApplicationLoaded = false;
let activeProfileId: string | null = null;

windowManager.onProfileGuideClosed(() => {
  if (mainApplicationLoaded) {
    windowManager.activate(WindowKey.MAIN);
  }
});

process.on('uncaughtException', (e) => logger.error('UncaughtException:', e));
process.on('unhandledRejection', (e) => logger.error('UnhandledRejection:', e));


function showProfileGuide(): void {
  if (!app.isReady()) return;
  windowManager.showProfileGuide();
}

function closeProfileGuide(): void {
  windowManager.closeProfileGuide();
}

function activatePrimaryWindow(): void {
  if (!mainApplicationLoaded) {
    showProfileGuide();
    return;
  }
  windowManager.activatePrimaryWindow();
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
  windowManager.enterProfileGuideMode();
}

async function launchMainApplication(profile: ProfileSummary): Promise<void> {
  if (mainApplicationLoaded) {
    if (profile.id === activeProfileId) {
      closeProfileGuide();
      windowManager.activate(WindowKey.MAIN);
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
      diModule,
      symbolModule,
      databaseModule,
      menuModule,
      helperModule,
      sessionModule,
    ] = await Promise.all([
      import('@main/di/di-container'),
      import('@main/di/symbol'),
      import('@main/database/seqimpl'),
      import('@main/core/menu/Menu'),
      import('@src/utils/helpers'),
      import('@main/database/seqimpl/Session'),
    ]);

    const { container } = diModule;
    const { DISymbol } = symbolModule;
    const { sequelize } = databaseModule;
    const { setAppMenu } = menuModule;
    const { getOperatingSystem } = helperModule;
    const { Session } = sessionModule;

    const proxyServerManager = container.get<ProxyServerManager>(DISymbol.ProxyServerManager);
    const ipcController = container.get<IpcController>(DISymbol.IpcController);
    const trayManager = container.get<TrayManager>(DISymbol.TrayManager);
    shortcutManager = container.get<ShortCutManager>(DISymbol.ShortcutManager);

    setAppMenu();
    await sequelize.sync();
    await proxyServerManager.start();

    ipcController.register();
    windowManager.activate(WindowKey.MAIN);
    windowManager.ensure(WindowKey.WORKER);
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
  registerBootstrapWindowControls(windowManager);

  app.on('second-instance', () => {
    activatePrimaryWindow();
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
    activatePrimaryWindow();
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
    windowManager.shutdown();
  });
}
