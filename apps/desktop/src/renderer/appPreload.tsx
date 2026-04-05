import '@src/preload/mainApi';


// Say something
console.log('[FreeFlow] : Preload execution started');

// Get versions
window.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  const { env } = process;
  const versions: Record<string, unknown> = {};

  // FreeFlow Package version
  versions['FreeFlow'] = env['npm_package_version'];
  versions['license'] = env['npm_package_license'];

  // Process versions
  for (const type of ['chrome', 'node', 'electron']) {
    versions[type] = process.versions[type];
  }

  // NPM deps versions
  for (const type of ['react']) {
    const v = env['npm_package_dependencies_' + type];
    if (v) versions[type] = v.replace('^', '+');
  }

  // NPM @dev deps versions
  for (const type of ['vite', 'typescript']) {
    const v = env['npm_package_devDependencies_' + type];
    if (v) versions[type] = v.replace('^', '+');
  }

  // Set versions to core data
  app.setAttribute('data-versions', JSON.stringify(versions));
});
