import React from 'react';
import { profileContext } from '@renderer/core/electronContextApi';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { createWeb25Comment, listWeb25Comments, type Web25Comment } from '@renderer/core/web25/client';
import { useWeb25SessionState } from '@renderer/core/web25/auth';
import { useNavigation, ViewType } from '@renderer/core/navigation';
import styles from './CommentView.module.css';

interface CommentViewProps {
  releaseId?: string | null;
  trackTitle?: string;
}

function authorInitial(comment: Web25Comment) {
  return (comment.author.displayName || 'FF').slice(0, 2).toUpperCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CommentView({ releaseId, trackTitle }: CommentViewProps) {
  const navigation = useNavigation();
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const { session } = useWeb25SessionState(web25BaseUrl.value);
  const [comments, setComments] = React.useState<Web25Comment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const loadComments = React.useCallback(async () => {
    if (!releaseId) {
      setComments([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = await listWeb25Comments(web25BaseUrl.value, {
        releaseId,
        limit: 40,
      });
      setComments(payload.items);
    } catch (err: any) {
      setError(err?.message ?? '评论加载失败');
    } finally {
      setLoading(false);
    }
  }, [releaseId, web25BaseUrl.value]);

  React.useEffect(() => {
    setComposerOpen(false);
    setDraft('');
    void loadComments();
  }, [loadComments]);

  const submitComment = React.useCallback(async () => {
    const body = draft.trim();
    if (!releaseId || !body || !session) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await createWeb25Comment(web25BaseUrl.value, {
        releaseId,
        body,
      });
      setComments((prev) => [created, ...prev]);
      setDraft('');
      setComposerOpen(false);
    } catch (err: any) {
      setError(err?.message ?? '评论发送失败');
    } finally {
      setSubmitting(false);
    }
  }, [draft, releaseId, session, web25BaseUrl.value]);

  const backToLyrics = React.useCallback(() => {
    if (navigation.canGoBack) {
      navigation.goBack();
      return;
    }
    navigation.replace(ViewType.LYRIC);
  }, [navigation]);

  const handleWheel = React.useCallback((event: React.WheelEvent<HTMLElement>) => {
    if (event.deltaY >= -36) return;

    let el: HTMLElement | null = event.target as HTMLElement;
    while (el && el !== event.currentTarget) {
      if (el.scrollHeight > el.clientHeight + 8) {
        const canScrollUp = el.scrollTop > 8;
        if (canScrollUp) return;
      }
      el = el.parentElement;
    }

    event.preventDefault();
    backToLyrics();
  }, [backToLyrics]);

  return (
    <section className={styles.root} aria-label="评论" onWheel={handleWheel}>
      <button
        type="button"
        className={styles.backCue}
        onClick={backToLyrics}
        aria-label="返回歌词"
      >
        <span />
        <span />
        <span />
      </button>

      <main className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>评论</p>
            <h2>{trackTitle || '正在播放'}</h2>
            <span>{releaseId ? `${comments.length} 条评论` : '评论未开放'}</span>
          </div>
          {releaseId ? (
            <button type="button" className={styles.refreshButton} onClick={() => void loadComments()} disabled={loading}>
              {loading ? '刷新中' : '刷新'}
            </button>
          ) : null}
        </header>

        {!composerOpen ? (
          <button
            type="button"
            className={styles.prompt}
            disabled={!releaseId}
            onClick={() => {
              if (!releaseId) return;
              setComposerOpen(true);
            }}
          >
            <span>{releaseId ? '写一条评论' : '暂时不能评论'}</span>
            <small>{session ? '分享你对这首歌的想法' : '登录后可以发表评论'}</small>
          </button>
        ) : null}

        {composerOpen && releaseId ? (
          <div className={styles.composer}>
            <textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={session ? '写下你想说的话' : '登录后即可发表评论'}
              disabled={!session || submitting}
            />
            <div className={styles.composerActions}>
              {!session ? (
                <button type="button" className={styles.secondaryButton} onClick={() => void profileContext.restartToGuide()}>
                  重启并登录
                </button>
              ) : null}
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setComposerOpen(false);
                  setDraft('');
                }}
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void submitComment()}
                disabled={!session || submitting || !draft.trim()}
              >
                {submitting ? '发布中' : '发布'}
              </button>
            </div>
          </div>
        ) : null}

        <div className={styles.stream} aria-busy={loading}>
          {error ? <div className={styles.error}>{error}</div> : null}
          {loading && comments.length === 0 ? <div className={styles.empty}>正在加载评论...</div> : null}
          {!loading && releaseId && comments.length === 0 ? (
            <div className={styles.empty}>还没有评论，来写第一条。</div>
          ) : null}
          {!releaseId ? (
            <div className={styles.empty}>这首歌还没有开放评论。</div>
          ) : null}
          {comments.map((comment) => (
            <article key={comment.id} className={styles.commentItem}>
              <div className={styles.avatar}>
                {comment.author.avatarUrl ? (
                  <img src={comment.author.avatarUrl} alt={comment.author.displayName} />
                ) : (
                  <span>{authorInitial(comment)}</span>
                )}
              </div>
              <div className={styles.commentBody}>
                <div className={styles.commentMeta}>
                  <strong>{comment.author.displayName || 'FreeFlow User'}</strong>
                  <time>{formatTime(comment.createdAt)}</time>
                </div>
                <p>{comment.body}</p>
              </div>
            </article>
          ))}
        </div>
      </main>
    </section>
  );
}
