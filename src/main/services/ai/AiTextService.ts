import { injectable } from 'inversify';

/**
 * A very light-weight, deterministic text cleaner to extract track title/artist
 * from noisy video-like titles. Designed to be replaced by real AI provider later.
 */
export interface CleanResult {
  title: string;
  artist: string;
  album?: string;
}

export interface AiTextService {
  /**
   * Clean a noisy title/artist pair and return normalized fields.
   */
  cleanTitleArtist(rawTitle: string, rawArtist?: string | null): Promise<CleanResult>;

  /**
   * Clean title/artist/album cooperatively. Album is best-effort and may be undefined.
   */
  cleanBasic(rawTitle: string, rawArtist?: string | null, rawAlbum?: string | null): Promise<CleanResult>;
}

@injectable()
export class HeuristicAiTextService implements AiTextService {
  async cleanTitleArtist(rawTitle: string, rawArtist?: string | null): Promise<CleanResult> {
    const r = await this.cleanBasic(rawTitle, rawArtist, null);
    return { title: r.title, artist: r.artist };
  }

  async cleanBasic(rawTitle: string, rawArtist?: string | null, rawAlbum?: string | null): Promise<CleanResult> {
    console.log('[AI] Heuristic cleanBasic.in', {
      title: (rawTitle || '').slice(0, 80),
      artist: (rawArtist || '').slice(0, 80),
      album: (rawAlbum || '').slice(0, 80),
    });
    const title0 = (rawTitle ?? '').trim();
    const artist0 = (rawArtist ?? '').trim();
    const album0 = (rawAlbum ?? '').trim();

    // 1) Strip common wrappers: 【】[]()（）《》「」『』{}
    const stripWrappers = (s: string) => s
      .replace(/[\[{（(【《「『]{1}([^\]】）》」』)}）]+)[\]】）》」』)}）]/g, '$1')
      .replace(/(?:^\s+|\s+$)/g, '')
      .trim();

    // 2) Remove trailing qualifiers like Official MV, Lyrics, Live, 4K, HQ, etc.
    const qualifiers = [
      'official', 'mv', 'pv', 'm\/v', 'lyric', 'lyrics', 'audio', 'video', 'live', '舞台', '现场',
      '中字', '中字版', '中英字幕', '纯享', '完整版', '完整版', '高音质', '4k', '8k', '1080p', 'official video', 'official mv', '专辑版', '单曲', 'ost',
    ];
    const rxQual = new RegExp(
      `(?:\\s|\u3000|[-–—_·|｜/\\\\\\s])*(?:${qualifiers.join('|')})(?:[\\s\u3000]*版)?$`,
      'i',
    );

    const stripQualifiers = (s: string) => s
      .replace(/[\s\u3000]*[\[【（(〈《『「].*?[\]】）)〉》』」]$/g, '') // trailing brackets segment
      .replace(rxQual, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // 3) Basic splitting heuristics on separators
    const seps = [' - ', ' — ', ' – ', ' — ', ' | ', '｜', ' / ', ' · '];
    const splitByKnownSep = (s: string): string[] => {
      for (const sep of seps) {
        if (s.includes(sep)) return s.split(sep).map(x => x.trim()).filter(Boolean);
      }
      return [s];
    };

    // Apply wrapper & qualifier stripping
    let t = stripQualifiers(stripWrappers(title0));

    // If artist known from provider: trust it; but still clean noise from artist
    let a = stripQualifiers(stripWrappers(artist0));

    // If artist empty or suspicious (same as title, or includes MV keywords), try to infer from title
    const hasArtist = !!a && a.toLowerCase() !== 'unknown' && a.toLowerCase() !== 'various artists';

    if (!hasArtist || a === t) {
      const parts = splitByKnownSep(t);
      if (parts.length === 2) {
        const [p1, p2] = parts;
        const noisyKeys = /(official|mv|lyric|lyrics|live|version|ver\.?|4k|8k|1080p|中字|现场|纯享|完整版)/i;
        // Heuristic: if the right part looks noisy, left is title; else assume left=artist, right=title
        if (noisyKeys.test(p2)) {
          t = p1;
        } else if (noisyKeys.test(p1)) {
          t = p2;
        } else {
          a = p1;
          t = p2; // default Artist - Title
        }
      }
    }

    // 4) Trim residual feat./ft./Feat. Normalize whitespace and separators
    const featRx = /(\(|\[)?\s*(feat\.|ft\.|featuring)\s+([^\)\]]+)(\)|\])?/i;
    const m = t.match(featRx);
    if (m && !hasArtist) {
      // Move featured artists to artist field if artist is still empty
      const featured = m[3].split(/,|&|、|\/|x/i).map(s => s.trim()).filter(Boolean).join(', ');
      a = a ? `${a}, ${featured}` : featured;
      t = t.replace(featRx, '').trim();
    } else {
      t = t.replace(featRx, '').trim();
    }

    // 5) Remove dangling hyphens/pipes/underscores at ends
    t = t.replace(/[-–—_·|｜]\s*$/g, '').trim();
    a = a.replace(/[-–—_·|｜]\s*$/g, '').trim();

    // Safety fallback
    if (!t) t = title0 || 'Unknown Title';
    if (!a) a = artist0 || '';

    // album：仅做基本清理
    let alb = stripQualifiers(stripWrappers(album0));
    alb = alb.replace(/(?:专辑|Album)[:：\s]*/gi, '').trim();
    if (!alb) alb = album0 || undefined as any;

    const out = { title: t, artist: a, album: alb } as CleanResult;
    console.log('[AI] Heuristic cleanBasic.out', out);
    return out;
  }
}
