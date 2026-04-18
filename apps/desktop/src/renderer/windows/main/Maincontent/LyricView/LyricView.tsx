import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './LyricView.module.css';
import Turntable from './Turntable';
import LyricScroller from './LyricScroller';

import { lyricsContext } from '@renderer/core/electronContextApi';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { createWeb25Comment, listWeb25Comments, type Web25Comment } from '@renderer/core/web25/client';
import { useWeb25SessionState } from '@renderer/core/web25/auth';
import PlayerController from '@renderer/core/controller/PlayerController';
import { Lyric, LyricLine } from '@src/shared/domainModel/lyricLine';
import { DefaultCover } from '@components/static';

interface LyricViewProps {
  player: PlayerController;
}

/** 二分定位当前行（nowMs 介于行[i] 与 行[i+1] 之间） */
const findActiveIndex = (lines: { time: number }[], nowMs: number) => {
  let l = 0,
    r = lines.length - 1;
  while (l <= r) {
    const m = (l + r) >>> 1;
    const next = lines[m + 1];
    if (nowMs >= lines[m].time && (!next || nowMs < next.time)) return m;
    nowMs < lines[m].time ? (r = m - 1) : (l = m + 1);
  }
  return 0;
};

const LyricView: React.FC<LyricViewProps> = ({ player }) => {
  /* ---------------- 状态 ---------------- */
  const [lyric, setLyric] = useState<Lyric | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<
    'origin' | 'pronunciation' | 'translation'
  >('origin');
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const { session } = useWeb25SessionState(web25BaseUrl.value);
  const [comments, setComments] = useState<Web25Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);

  /* ---------------- 引用 ---------------- */
  // 由子组件内部管理滚动与冷却

  /* ---------------- 载入歌词 ---------------- */
  const loadLyrics = useCallback(async () => {
    const track = player.playQueue.currentTrack;
    if (!track) {
      setLyric(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await lyricsContext.getLyrics(track);
      setLyric(data);
      // 默认顺序：原 -> 音 -> 译
      if (data.originLines.length) setActiveType('origin');
      else if (data.pronunciationLines.length) setActiveType('pronunciation');
      else setActiveType('translation');
    } catch (e: any) {
      setError(e?.message ?? '加载歌词失败');
    } finally {
      setLoading(false);
    }
  }, [player.playQueue.currentTrack]);

  useEffect(() => {
    loadLyrics();
  }, [loadLyrics]);

  const currentReleaseId = player.playQueue.currentTrack?.freeflow?.releaseId ?? '';

  const loadComments = useCallback(async () => {
    if (!currentReleaseId) {
      setComments([]);
      setCommentsError(null);
      return;
    }

    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const payload = await listWeb25Comments(web25BaseUrl.value, {
        releaseId: currentReleaseId,
        limit: 30,
      });
      setComments(payload.items);
    } catch (e: any) {
      setCommentsError(e?.message ?? '评论加载失败');
    } finally {
      setCommentsLoading(false);
    }
  }, [currentReleaseId, web25BaseUrl.value]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const submitComment = useCallback(async () => {
    const body = commentDraft.trim();
    if (!currentReleaseId || !body || !session) return;

    setCommentBusy(true);
    setCommentsError(null);
    try {
      const created = await createWeb25Comment(web25BaseUrl.value, {
        releaseId: currentReleaseId,
        body,
      });
      setComments((prev) => [created, ...prev]);
      setCommentDraft('');
    } catch (e: any) {
      setCommentsError(e?.message ?? '评论发送失败');
    } finally {
      setCommentBusy(false);
    }
  }, [commentDraft, currentReleaseId, session, web25BaseUrl.value]);

  const hasOrigin = !!lyric?.originLines.length;
  const hasPronunciation = !!lyric?.pronunciationLines.length;
  const hasTranslation = !!lyric?.translationLines.length;

  /* ---------------- 当前渲染的行 ---------------- */
  const lines: LyricLine[] = useMemo(() => {
    if (!lyric) return [];
    switch (activeType) {
      case 'pronunciation':
        return lyric.pronunciationLines;
      case 'translation':
        return lyric.translationLines;
      default:
        return lyric.originLines;
    }
  }, [lyric, activeType]);

  /* ---------------- 当前行索引 ---------------- */
  const activeIndex = useMemo(() => {
    if (!lines.length) return null;
    return findActiveIndex(lines, (player.currentTime || 0) * 1000);
  }, [lines, player.currentTime]);

  // 自动滚动逻辑已迁移至 LyricScroller 内部

  /* ---------------- 左侧封面 src & 回退 ---------------- */
  const coverSrc = player.playQueue.currentTrack?.cover_src || DefaultCover;
  const onCoverError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== DefaultCover) img.src = DefaultCover;
  };

  /* ---------------- 错误态交由子组件展示 ---------------- */

  /* ---------------- 正常 UI ---------------- */
  return (
    <div className={styles.root}>
      {/* 左：黑胶唱机（独立组件） */}
      <div className={styles.left}>
        <Turntable
          coverSrc={coverSrc}
          isPlaying={player.isPlaying}
          onCoverError={onCoverError}
        />
      </div>

      {/* 右：歌词（独立组件） */}
      <LyricScroller
        title='歌词'
        lines={lines}
        loading={loading || !lyric}
        error={error}
        activeIndex={activeIndex}
        activeType={activeType}
        onTypeChange={setActiveType}
        hasOrigin={hasOrigin}
        hasPronunciation={hasPronunciation}
        hasTranslation={hasTranslation}
        onLineClick={(timeMs) => player.setCurrentTime(timeMs / 1000)}
        onRetry={loadLyrics}
      />

      <aside className={styles.comments}>
        <div className={styles.commentsHeader}>
          <div>
            <h2>评论</h2>
            <p>{currentReleaseId ? `${comments.length} 条讨论` : '仅 FreeFlow 资源支持评论'}</p>
          </div>
          {currentReleaseId ? (
            <button type="button" className={styles.refreshButton} onClick={() => void loadComments()} disabled={commentsLoading}>
              {commentsLoading ? '刷新中' : '刷新'}
            </button>
          ) : null}
        </div>

        {currentReleaseId ? (
          <>
            <div className={styles.commentComposer}>
              <textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder={session ? '写下你的想法' : '完成 SIWE 登录后可发表评论'}
                disabled={!session || commentBusy}
              />
              <button
                type="button"
                onClick={() => void submitComment()}
                disabled={!session || commentBusy || !commentDraft.trim()}
              >
                {commentBusy ? '发送中' : '发送'}
              </button>
            </div>

            <div className={styles.commentStream}>
              {commentsError ? <div className={styles.commentError}>{commentsError}</div> : null}
              <div className={styles.commentList}>
                {comments.map((comment) => (
                  <article key={comment.id} className={styles.commentItem}>
                    <div className={styles.commentAvatar}>
                      {comment.author.avatarUrl ? (
                        <img src={comment.author.avatarUrl} alt={comment.author.displayName} />
                      ) : (
                        <span>{comment.author.displayName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className={styles.commentBody}>
                      <div className={styles.commentMeta}>
                        <strong>{comment.author.displayName}</strong>
                        <time>{new Date(comment.createdAt).toLocaleString('zh-CN')}</time>
                      </div>
                      <p>{comment.body}</p>
                    </div>
                  </article>
                ))}
                {!commentsLoading && comments.length === 0 ? (
                  <div className={styles.emptyComments}>还没有评论。</div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
};

export default LyricView;
