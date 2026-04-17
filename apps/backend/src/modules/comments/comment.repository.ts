import { CommentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/prisma.js';

const commentInclude = {
  user: {
    include: {
      primaryWalletIdentity: true,
    },
  },
  replies: {
    where: {
      status: CommentStatus.PUBLISHED,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 5,
    include: {
      user: {
        include: {
          primaryWalletIdentity: true,
        },
      },
    },
  },
} satisfies Prisma.CommentInclude;

export class CommentRepository {
  async findResourceByKey(resourceKey: string) {
    return prisma.resource.findUnique({
      where: {
        resourceKey,
      },
    });
  }

  async listByResourceKey(input: {
    resourceKey: string;
    limit: number;
    cursor?: string | undefined;
  }) {
    const resource = await this.findResourceByKey(input.resourceKey);
    if (!resource) {
      return {
        resource: null,
        comments: [],
      };
    }

    const comments = await prisma.comment.findMany({
      where: {
        resourceId: resource.id,
        parentId: null,
        status: CommentStatus.PUBLISHED,
        deletedAt: null,
      },
      include: commentInclude,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: input.limit + 1,
      ...(input.cursor
        ? {
          cursor: { id: input.cursor },
          skip: 1,
        }
        : {}),
    });

    return {
      resource,
      comments,
    };
  }

  async create(input: {
    resourceId: string;
    userId: string;
    parentId?: string | null;
    body: string;
  }) {
    return prisma.comment.create({
      data: {
        resourceId: input.resourceId,
        userId: input.userId,
        parentId: input.parentId ?? null,
        body: input.body,
      },
      include: commentInclude,
    });
  }

  async findPublishedComment(commentId: string) {
    return prisma.comment.findFirst({
      where: {
        id: commentId,
        status: CommentStatus.PUBLISHED,
        deletedAt: null,
      },
    });
  }
}

export type PersistedComment = Awaited<ReturnType<CommentRepository['create']>>;
export type PersistedCommentListItem = Awaited<ReturnType<CommentRepository['listByResourceKey']>>['comments'][number];

export const commentRepository = new CommentRepository();
