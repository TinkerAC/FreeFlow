import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Utilities for setting/clearing custom file/folder icons on macOS by
 * invoking the compiled `setfileicon` Swift helper.
 *
 * Compile helper (already done in this repo root):
 *   xcrun swiftc src/utils/SetIconFile.swift -o setfileicon
 */

export class IconUtilsError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'IconUtilsError';
    this.code = code;
  }
}

/** Resolve the setfileicon binary path, trying a few common locations. */
function resolveBinary(): string | null {
  // 1) Explicit env override
  const envPath = process.env.SETFILEICON_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  // 2) Workspace root (when running in dev from repo root)
  const cwdCandidate = path.resolve(process.cwd(), 'setfileicon');
  if (fs.existsSync(cwdCandidate)) return cwdCandidate;

  // 3) Search upwards from current file directory (handles dist build paths)
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, 'setfileicon');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // 4) Electron packaged app: look in resources (asar/unpacked preferred)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron') as { app?: { getAppPath?: () => string } };
    const appPath = app?.getAppPath?.();
    if (appPath) {
      const unpacked = path.resolve(appPath, '..', 'setfileicon');
      if (fs.existsSync(unpacked)) return unpacked;
    }
  } catch {
    // not running in electron, ignore
  }

  return null;
}

function ensureExecutable(filePath: string) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
  } catch {
    try {
      fs.chmodSync(filePath, 0o755);
    } catch {
      // ignore; execFile may still work depending on FS perms
    }
  }
}

function assertDarwin() {
  if (process.platform !== 'darwin') {
    throw new IconUtilsError('setfileicon is only supported on macOS (darwin).', 'ERR_PLATFORM');
  }
}

function run(binary: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(binary, args, (error) => {
      if (error) {
        const e = error as NodeJS.ErrnoException;
        const msg = `setfileicon failed: ${e.message}`;
        const err = new IconUtilsError(msg, e.code);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/** Check whether the helper binary is available on this system. */
export function isIconSetterAvailable(): boolean {
  try {
    assertDarwin();
    const bin = resolveBinary();
    return !!bin;
  } catch {
    return false;
  }
}

/**
 * Set a custom icon for the target file/folder using the given icon image (.icns or .png).
 * - iconPath: Path to .icns/.png (Finder will prioritize .icns for best fidelity)
 * - targetPath: Path to file or folder
 */
export async function setFileIcon(iconPath: string, targetPath: string): Promise<void> {
  assertDarwin();
  const bin = resolveBinary();
  if (!bin) throw new IconUtilsError('Cannot locate setfileicon binary. Build it or set SETFILEICON_PATH.', 'ERR_NOT_FOUND');

  const absIcon = path.resolve(iconPath);
  const absTarget = path.resolve(targetPath);
  if (!fs.existsSync(absIcon)) throw new IconUtilsError(`Icon not found: ${absIcon}`, 'ERR_NOINPUT');
  if (!fs.existsSync(absTarget)) throw new IconUtilsError(`Target not found: ${absTarget}`, 'ERR_NOINPUT');

  ensureExecutable(bin);
  await run(bin, [absIcon, absTarget]);
}

/** Clear any custom icon on the target file/folder, restoring default. */
export async function clearFileIcon(targetPath: string): Promise<void> {
  assertDarwin();
  const bin = resolveBinary();
  if (!bin) throw new IconUtilsError('Cannot locate setfileicon binary. Build it or set SETFILEICON_PATH.', 'ERR_NOT_FOUND');

  const absTarget = path.resolve(targetPath);
  if (!fs.existsSync(absTarget)) throw new IconUtilsError(`Target not found: ${absTarget}`, 'ERR_NOINPUT');

  ensureExecutable(bin);
  await run(bin, ['--clear', absTarget]);
}

/**
 * Convenience wrapper that sets a custom icon, optionally clearing first to
 * mitigate Finder cache issues (the Swift tool already clears first as well).
 */
export async function setFileIconWithRefresh(iconPath: string, targetPath: string): Promise<void> {
  await setFileIcon(iconPath, targetPath);
}
