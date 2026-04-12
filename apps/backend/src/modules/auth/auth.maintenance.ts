import { authRepository } from './auth.repository.js';
import { createScopedLogger, toErrorLogField } from '../../infra/logging/logger.js';

const AUTH_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const maintenanceLogger = createScopedLogger('jobs.auth.maintenance');

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * 清理过期 nonce 和会话。
 * 失败只记录日志，不影响对外请求链路。
 */
export async function runAuthMaintenance() {
  try {
    await authRepository.pruneExpiredAuthArtifacts();
  } catch (error) {
    maintenanceLogger.error(toErrorLogField(error), 'auth maintenance failed');
  }
}

/**
 * 在进程启动阶段注册认证清理任务，避免把生命周期逻辑塞进 service 构造函数。
 */
export function startAuthMaintenance() {
  if (cleanupTimer) return;

  maintenanceLogger.info({
    intervalMs: AUTH_CLEANUP_INTERVAL_MS,
  }, 'auth maintenance started');

  cleanupTimer = setInterval(() => {
    void runAuthMaintenance();
  }, AUTH_CLEANUP_INTERVAL_MS);

  cleanupTimer.unref?.();
  void runAuthMaintenance();
}

/**
 * 停止后台清理任务，确保关闭流程干净可控。
 */
export function stopAuthMaintenance() {
  if (!cleanupTimer) return;
  clearInterval(cleanupTimer);
  cleanupTimer = null;
  maintenanceLogger.info('auth maintenance stopped');
}
