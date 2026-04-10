import { Router } from 'express';
import { attachSession } from '../../security/session/attach-session.js';
import { requireAuth } from '../../security/session/require-auth.js';
import { CreateCreatorReleaseSchema, UpdateCreatorReleaseSchema } from './release.schemas.js';
import { releaseService } from './release.service.js';

/**
 * 发行管理模块的 HTTP 入口。
 */
export const releaseRouter = Router();

releaseRouter.use(attachSession);
releaseRouter.use(requireAuth);

releaseRouter.get('/', async (req, res, next) => {
  try {
    const payload = await releaseService.listCreatorReleases(req.authSession!.userId);
    res.json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
});

releaseRouter.post('/', async (req, res, next) => {
  try {
    const parsed = CreateCreatorReleaseSchema.parse(req.body ?? {});
    const release = await releaseService.createCreatorRelease(req.authSession!.userId, parsed);
    res.status(201).json({
      ok: true,
      data: release,
    });
  } catch (error) {
    next(error);
  }
});

releaseRouter.get('/:releaseId', async (req, res, next) => {
  try {
    const release = await releaseService.getCreatorRelease(req.authSession!.userId, req.params.releaseId);
    res.json({
      ok: true,
      data: release,
    });
  } catch (error) {
    next(error);
  }
});

releaseRouter.patch('/:releaseId', async (req, res, next) => {
  try {
    const parsed = UpdateCreatorReleaseSchema.parse(req.body ?? {});
    const release = await releaseService.updateCreatorRelease(req.authSession!.userId, req.params.releaseId, parsed);
    res.json({
      ok: true,
      data: release,
    });
  } catch (error) {
    next(error);
  }
});
