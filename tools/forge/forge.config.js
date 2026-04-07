// Forge Configuration
const path = require('path');
const rootDir = process.cwd();

const { VitePlugin } = require('@electron-forge/plugin-vite');

module.exports = {
  // Packager Config
  packagerConfig: {
    // Create asar archive for main, renderer process files
    asar: {
      unpack: '{**/node_modules/sharp/**/*,**/node_modules/sqlite3/**/*,**/node_modules/lzma-native/**/*,**/node_modules/canvas/**/*}',
    },
    // Set executable name
    executableName: 'FreeFlow',
    // Set application copyright
    appCopyright: 'Copyright (C) 2024 Tinker',
    // Set application icon
    icon: path.resolve('assets/appIcons/icon.icns'),

    // ⬇️ 新增，把可切换图标文件夹带进最终应用包
    extraResource: ['assets/appIcons', 'assets/macTools'],
  },
  // Forge Makers
  makers: [
    {
      // The Zip target builds basic .zip files containing your packaged application.
      // There are no platform-specific dependencies for using this maker, and it will run on any platform.
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      // The deb target builds .deb packages, which are the standard package format for Debian-based
      // Linux distributions such as Ubuntu.
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      // The RPM target builds .rpm files, which is the standard package format for
      // RedHat-based Linux distributions such as Fedora.
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  // Forge Plugins
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        build: [
          {
            entry: 'src/main/main.ts',
            config: 'vite.main.config.mts',
            target: 'main',
          },
          {
            entry: 'src/renderer/appPreload.tsx',
            config: 'vite.preload.config.mts',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'app_window',
            config: 'vite.renderer.config.mts',
          },
        ],
      },
    },
  ],
};
