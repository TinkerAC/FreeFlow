import type { PersistedComment, PersistedCommentListItem } from './comment.repository.js';

type CommentRecord = PersistedComment | PersistedCommentListItem;

export type CommentPayload = {
  id: string;
  releaseId: string;
  body: string;
  author: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    walletAddress: string | null;
  };
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
    releaseId: comment.releaseId,
    body: comment.body,
    author: {
      userId: user.id,
      displayName: user.displayName || formatAddress(walletAddress) || 'FreeFlow User',
      avatarUrl: user.avatarUrl ?? null,
      walletAddress,
    },
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}
