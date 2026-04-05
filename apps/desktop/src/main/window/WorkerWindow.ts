import { AbstractWindow } from './AbstractWindow';

export default class WorkerWindow extends AbstractWindow {
  constructor(workerURL?: string) {
    super({
      width: 400,
      height: 300,
      show: false,
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: false,
      },
    });
    if (workerURL) this.safeLoadURL(workerURL).then(r => r);

    this.removeAllListeners('close');
    this.on('close', () => this.destroy());
  }
}
