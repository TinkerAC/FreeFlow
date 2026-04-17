import { AppError } from '../../core/errors/app-error.js';
import { commentRepository } from './comment.repository.js';
import { mapCommentRecord } from './comment.mapper.js';
import type { CreateCommentInput, ListCommentsQuery } from './comment.schemas.js';

export class CommentService {
  async listComments(input: ListCommentsQuery) {
    const payload = await commentRepository.listByResourceKey(input);
    if (!payload.resource) {
      throw new AppError(404, 'Resource not found', 'RESOURCE_NOT_FOUND');
    }

    const hasMore = payload.comments.length > input.limit;
    const pageItems = hasMore ? payload.comments.slice(0, input.limit) : payload.comments;

    return {
      resource: {
        id: payload.resource.id,
        resourceKey: payload.resource.resourceKey,
        type: payload.resource.type,
        title: payload.resource.title,
      },
      items: pageItems.map(mapCommentRecord),
      nextCursor: hasMore ? pageItems.at(-1)?.id ?? null : null,
    };
  }

  async createComment(userId: string, input: CreateCommentInput) {
    const resource = await commentRepository.findResourceByKey(input.resourceKey);
    if (!resource) {
      throw new AppError(404, 'Resource not found', 'RESOURCE_NOT_FOUND');
    }

    const parentId = input.parentId?.trim() || null;
    if (parentId) {
      const parent = await commentRepository.findPublishedComment(parentId);
      if (!parent || parent.resourceId !== resource.id) {
        throw new AppError(400, 'Parent comment not found for resource', 'PARENT_COMMENT_NOT_FOUND');
      }
    }

    const comment = await commentRepository.create({
      resourceId: resource.id,
      userId,
      parentId,
      body: input.body.trim(),
    });

    return mapCommentRecord(comment);
  }
}

export const commentService = new CommentService();
