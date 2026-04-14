import { Router } from 'express';
import { resourceService } from './resource.service.js';

/**
 * 公开资源检索入口。
 * 这里不要求会话，供播放器检索与解析链上资源。
 */
export const resourceRouter = Router();

resourceRouter.get('/search', async (req, res, next) => {
  try {
    const keyword = String(req.query.q ?? '').trim();
    const limitInput = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(limitInput)
      ? Math.min(50, Math.max(1, Math.trunc(limitInput)))
      : 20;

    const payload = await resourceService.searchTracks(keyword, limit);
    res.json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
});

resourceRouter.get('/resolve', async (req, res, next) => {
  try {
    const resourceKey = String(req.query.resourceKey ?? '').trim();
    if (!resourceKey) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'resourceKey is required',
        },
      });
      return;
    }

    const payload = await resourceService.resolveTrack(resourceKey);
    res.json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
});
