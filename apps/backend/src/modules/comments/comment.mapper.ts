import type { PersistedComment, PersistedCommentListItem } from './comment.repository.js';

type CommentRecord = PersistedComment | PersistedCommentListItem;

export type CommentPayload = {
  id: string;
  resourceId: string;
  parentId: string | null;
  body: string;
  status: string;
  author: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    walletAddress: string | null;
  };
  replies: CommentPayload[];
  createdAt: string;
  updatedAt: string;
};

function formatAddress(address?: string | null) {
  if (!address) return null;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function mapCommentRecord(comment: CommentRecord): CommentPayload {
  const user = comment.user;
  const walletAddress = user.primaryWalletIdentity?.address ?? null;

  return {
    id: comment.id,
    resourceId: comment.resourceId,
    parentId: comment.parentId,
    body: comment.body,
    status: comment.status,
    author: {
      userId: user.id,
      displayName: user.displayName || formatAddress(walletAddress) || 'FreeFlow User',
      avatarUrl: user.avatarUrl ?? null,
      walletAddress,
    },
    replies: comment.replies?.map((reply) => mapCommentRecord(reply as CommentRecord)) ?? [],
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}
