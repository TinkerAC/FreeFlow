import { injectable } from 'inversify';
import type { AiTextService, CleanResult } from '@main/services/ai/AiTextService';
import { GoogleGenerativeAI } from '@google/generative-ai';

@injectable()
export class GeminiAiTextService implements AiTextService {
  private readonly modelName: string;
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey: string, model = 'gemini-2.5-flash') {
    this.modelName = model;
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async cleanTitleArtist(rawTitle: string, rawArtist?: string | null): Promise<CleanResult> {
    const r = await this.cleanBasic(rawTitle, rawArtist, null);
    return { title: r.title, artist: r.artist };
  }

  async cleanBasic(rawTitle: string, rawArtist?: string | null, rawAlbum?: string | null): Promise<CleanResult> {
    console.log('[AI] Gemini cleanBasic.in', {
      model: this.modelName,
      title: (rawTitle || '').slice(0, 80),
      artist: (rawArtist || '').slice(0, 80),
      album: (rawAlbum || '').slice(0, 80),
    });
    const sys = [
      'You are a music metadata cleaner.',
      'Given a noisy video-like track title and optional artist/album, extract canonical title/artist/album.',
      'Rules:',
      '- Return pure JSON only, with keys: title, artist, album.',
      '- Remove qualifiers (MV, Official, Live, 4K, HQ, 中字, 现场, 纯享, 完整版, etc.).',
      '- If title contains pattern "Artist - Title", infer accordingly.',
      '- Keep featured artists in artist field (e.g., "Artist, Featured").',
      '- If album can be inferred from brackets like 【专辑】/《Album》 or input album field, set it; otherwise album = "".',
      '- Do not include year or extra text; keep plain names.',
    ].join('\n');

    const prompt = [
      sys,
      'Return JSON only. Examples:',
      'Input: {"title":"【官方MV】周杰伦-晴天 (Official MV) 4K","artist":"","album":"范特西"} -> {"title":"晴天","artist":"周杰伦","album":"范特西"}',
      'Input: {"title":"RADWIMPS - なんでもないや (Live)","artist":"","album":""} -> {"title":"なんでもないや","artist":"RADWIMPS","album":""}',
      'Input: {"title":"Dua Lipa - Levitating (feat. DaBaby) [Official Video]","artist":"","album":"Future Nostalgia"} -> {"title":"Levitating","artist":"Dua Lipa, DaBaby","album":"Future Nostalgia"}',
      '',
      `Input: ${JSON.stringify({
        title: String(rawTitle ?? ''),
        artist: String(rawArtist ?? ''),
        album: String(rawAlbum ?? ''),
      })}`,
      'Output:',
    ].join('\n');

    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });
      const resp = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      const text = resp.response.text();
      const json = this.extractJson(text);
      const title = String(json.title ?? '').trim();
      const artist = String(json.artist ?? '').trim();
      const album = String(json.album ?? '').trim();
      const out = {
        title: title || String(rawTitle ?? ''),
        artist: artist || String(rawArtist ?? ''),
        album: album || String(rawAlbum ?? ''),
      } as CleanResult;
      console.log('[AI] Gemini cleanBasic.out', out);
      return out;
    } catch (e) {
      console.warn('[AI] Gemini cleanBasic.error:', e);
      return {
        title: String(rawTitle ?? ''),
        artist: String(rawArtist ?? ''),
        album: String(rawAlbum ?? ''),
      } as CleanResult;
    }
  }

  private extractJson(s: string): any {
    // Try direct JSON first
    try {
      return JSON.parse(s);
    } catch {
    }
    // Try to find fenced JSON
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
      }
    }
    // Basic key-value fallback
    const title = s.match(/\"?title\"?\s*[:：]\s*\"([^\"]+)/i)?.[1];
    const artist = s.match(/\"?artist\"?\s*[:：]\s*\"([^\"]+)/i)?.[1];
    const album = s.match(/\"?album\"?\s*[:：]\s*\"([^\"]+)/i)?.[1];
    return { title, artist, album };
  }

  // cache removed: always request
}
