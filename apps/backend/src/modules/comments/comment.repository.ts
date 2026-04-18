import { Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/prisma.js';

const commentInclude = {
  user: {
    include: {
      primaryWalletIdentity: true,
    },
  },
} satisfies Prisma.CommentInclude;

export class CommentRepository {
  async findReleaseById(releaseId: string) {
    return prisma.creatorRelease.findUnique({
      where: {
        id: releaseId,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });
  }

  async listByReleaseId(input: {
    releaseId: string;
    limit: number;
    cursor?: string | undefined;
  }) {
    const release = await this.findReleaseById(input.releaseId);
    if (!release) {
      return {
        release: null,
        comments: [],
      };
    }

    const comments = await prisma.comment.findMany({
      where: {
        releaseId: release.id,
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
      release,
      comments,
    };
  }

  async create(input: {
    releaseId: string;
    userId: string;
    body: string;
  }) {
    return prisma.comment.create({
      data: {
        releaseId: input.releaseId,
        userId: input.userId,
        body: input.body,
      },
      include: commentInclude,
    });
  }
}

export type PersistedComment = Awaited<ReturnType<CommentRepository['create']>>;
export type PersistedCommentListItem = Awaited<ReturnType<CommentRepository['listByReleaseId']>>['comments'][number];

export const commentRepository = new CommentRepository();
