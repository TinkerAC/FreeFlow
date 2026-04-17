import { Router } from 'express';
import { attachSession } from '../../security/session/attach-session.js';
import { requireAuth } from '../../security/session/require-auth.js';
import { CreateCommentSchema, ListCommentsQuerySchema } from './comment.schemas.js';
import { commentService } from './comment.service.js';

export const commentRouter = Router();

commentRouter.use(attachSession);

commentRouter.get('/', async (req, res, next) => {
  try {
    const parsed = ListCommentsQuerySchema.parse(req.query ?? {});
    const payload = await commentService.listComments(parsed);
    res.json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
});

commentRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = CreateCommentSchema.parse(req.body ?? {});
    const comment = await commentService.createComment(req.authSession!.userId, parsed);
    res.status(201).json({
      ok: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
});
