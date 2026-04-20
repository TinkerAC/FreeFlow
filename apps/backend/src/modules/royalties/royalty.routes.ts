import { Router } from 'express';
import { attachSession } from '../../security/session/attach-session.js';
import { requireAuth } from '../../security/session/require-auth.js';
import { royaltyService } from './royalty.service.js';
import { RecordRoyaltyClaimSchema } from './royalty.schemas.js';

export const royaltyRouter = Router();

royaltyRouter.use(attachSession);
royaltyRouter.use(requireAuth);

royaltyRouter.get('/', async (req, res, next) => {
  try {
    const chainIdRaw = typeof req.query.chainId === 'string' ? req.query.chainId : '';
    const chainId = /^\d+$/.test(chainIdRaw) ? Number(chainIdRaw) : null;
    const payload = await royaltyService.listRoyaltyWorkspace(
      req.authSession!.userId,
      req.authSession!.address,
      chainId,
    );
    res.json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
});

royaltyRouter.post('/claims', async (req, res, next) => {
  try {
    const parsed = RecordRoyaltyClaimSchema.parse(req.body ?? {});
    const claim = await royaltyService.recordClaim(req.authSession!.userId, req.authSession!.address, parsed);
    res.status(201).json({
      ok: true,
      data: claim,
    });
  } catch (error) {
    next(error);
  }
});
