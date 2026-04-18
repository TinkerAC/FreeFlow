import { Router } from 'express';
import { attachSession } from '../../security/session/attach-session.js';
import { requireAuth } from '../../security/session/require-auth.js';
import { purchaseService } from './purchase.service.js';
import { UpsertPurchaseSchema } from './purchase.schemas.js';

export const purchaseRouter = Router();

purchaseRouter.use(attachSession);
purchaseRouter.use(requireAuth);

purchaseRouter.post('/', async (req, res, next) => {
  try {
    const parsed = UpsertPurchaseSchema.parse(req.body ?? {});
    const purchase = await purchaseService.upsertPurchase(req.authSession!.userId, parsed);
    res.status(201).json({
      ok: true,
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
});
