import { AppError } from '../../core/errors/app-error.js';
import { commentRepository } from './comment.repository.js';
import { mapCommentRecord } from './comment.mapper.js';
import type { CreateCommentInput, ListCommentsQuery } from './comment.schemas.js';

export class CommentService {
  async listComments(input: ListCommentsQuery) {
    const payload = await commentRepository.listByReleaseId(input);
    if (!payload.release) {
      throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
    }

    const hasMore = payload.comments.length > input.limit;
    const pageItems = hasMore ? payload.comments.slice(0, input.limit) : payload.comments;

    return {
      release: {
        id: payload.release.id,
        title: payload.release.title,
        status: payload.release.status,
      },
      items: pageItems.map(mapCommentRecord),
      nextCursor: hasMore ? pageItems.at(-1)?.id ?? null : null,
    };
  }

  async createComment(userId: string, input: CreateCommentInput) {
    const release = await commentRepository.findReleaseById(input.releaseId);
    if (!release) {
      throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
    }

    const comment = await commentRepository.create({
      releaseId: release.id,
      userId,
      body: input.body.trim(),
    });

    return mapCommentRecord(comment);
  }
}

export const commentService = new CommentService();
