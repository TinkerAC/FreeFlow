import { Pool } from 'pg';

type PoolConfigInput = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

function readIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * MusicBrainz 样本库默认按本地 Docker 端口 55432 暴露。
 * 这里把连接参数集中起来，避免实验脚本四处分散读取环境变量。
 */
export function resolveMusicbrainzConnectionConfig(): PoolConfigInput {
  return {
    host: process.env.MUSICBRAINZ_PGHOST ?? '127.0.0.1',
    port: readIntegerEnv('MUSICBRAINZ_PGPORT', 55432),
    database: process.env.MUSICBRAINZ_PGDATABASE ?? 'musicbrainz_db',
    user: process.env.MUSICBRAINZ_PGUSER ?? 'musicbrainz',
    password: process.env.MUSICBRAINZ_PGPASSWORD ?? 'musicbrainz',
  };
}

export type MusicbrainzProfileRow = {
  total_artists: number;
  total_artist_aliases: number;
  total_releases: number;
  total_release_aliases: number;
  total_release_groups: number;
  total_recordings: number;
  total_tracks: number;
  total_media: number;
  releases_with_alias: number;
  artists_with_alias: number;
};

export type MusicbrainzCoreGroupRow = {
  release_id: number;
  release_gid: string;
  release_name: string;
  artist_name: string;
  track_count: number;
  has_release_alias: boolean;
};

export type MusicbrainzTrackRow = {
  mb_track_id: number;
  mb_track_gid: string | null;
  track_name: string;
  artist_name: string;
  artist_id: number | null;
  release_id: number;
  release_gid: string | null;
  release_name: string;
  release_group_id: number | null;
  release_group_gid: string | null;
  release_group_name: string | null;
  medium_position: number;
  track_position: number;
  last_updated: Date | string | null;
  duration_ms: number | null;
  genre_tag: string | null;
  release_alias: string | null;
  artist_alias: string | null;
  date_year: number | null;
  date_month: number | null;
  date_day: number | null;
};

/**
 * 这个封装只暴露实验真正需要的几类查询。
 * 这样后续如果把样本库换成完整库或更换连接方式，只需改这一层。
 */
export class MusicbrainzSource {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool(resolveMusicbrainzConnectionConfig());
  }

  async close() {
    await this.pool.end();
  }

  async readProfile() {
    const { rows } = await this.pool.query<MusicbrainzProfileRow>(`
      select
        (select count(*)::int from musicbrainz.artist) as total_artists,
        (select count(*)::int from musicbrainz.artist_alias) as total_artist_aliases,
        (select count(*)::int from musicbrainz.release) as total_releases,
        (select count(*)::int from musicbrainz.release_alias) as total_release_aliases,
        (select count(*)::int from musicbrainz.release_group) as total_release_groups,
        (select count(*)::int from musicbrainz.recording) as total_recordings,
        (select count(*)::int from musicbrainz.track) as total_tracks,
        (select count(*)::int from musicbrainz.medium) as total_media,
        (select count(distinct release)::int from musicbrainz.release_alias) as releases_with_alias,
        (select count(distinct artist)::int from musicbrainz.artist_alias) as artists_with_alias
    `);

    const row = rows[0];
    if (!row) {
      throw new Error('MusicBrainz 样本库画像查询返回空结果。');
    }
    return row;
  }

  async readCoreGroups(input: {
    minTracksPerRelease: number;
    maxTracksPerRelease: number;
    limit: number;
  }) {
    const { rows } = await this.pool.query<MusicbrainzCoreGroupRow>(`
      with release_stats as (
        select
          r.id as release_id,
          r.gid::text as release_gid,
          r.name as release_name,
          ac.name as artist_name,
          count(*)::int as track_count,
          max(case when ra.id is not null then 1 else 0 end) = 1 as has_release_alias
        from musicbrainz.release r
        join musicbrainz.artist_credit ac
          on ac.id = r.artist_credit
        join musicbrainz.medium m
          on m.release = r.id
        join musicbrainz.track t
          on t.medium = m.id
        left join musicbrainz.release_alias ra
          on ra.release = r.id
        where trim(coalesce(r.name, '')) <> ''
          and trim(coalesce(ac.name, '')) <> ''
          and trim(coalesce(t.name, '')) <> ''
        group by r.id, r.gid, r.name, ac.name
        having count(*) between $1 and $2
      )
      select
        release_id,
        release_gid,
        release_name,
        artist_name,
        track_count,
        has_release_alias
      from release_stats
      order by
        has_release_alias desc,
        track_count desc,
        release_id asc
      limit $3
    `, [input.minTracksPerRelease, input.maxTracksPerRelease, input.limit]);

    return rows;
  }

  async readCoreTracks(releaseIds: number[]) {
    if (releaseIds.length === 0) return [];

    const { rows } = await this.pool.query<MusicbrainzTrackRow>(`
      select
        t.id as mb_track_id,
        t.gid::text as mb_track_gid,
        t.name as track_name,
        tac.name as artist_name,
        first_artist.artist_id,
        r.id as release_id,
        r.gid::text as release_gid,
        r.name as release_name,
        rg.id as release_group_id,
        rg.gid::text as release_group_gid,
        rg.name as release_group_name,
        m.position as medium_position,
        t.position as track_position,
        coalesce(t.last_updated, rec.last_updated, r.last_updated) as last_updated,
        coalesce(rec.length, t.length) as duration_ms,
        genre_tag.name as genre_tag,
        release_alias.name as release_alias,
        artist_alias.name as artist_alias,
        nullif(release_country.date_year, 0)::int as date_year,
        nullif(release_country.date_month, 0)::int as date_month,
        nullif(release_country.date_day, 0)::int as date_day
      from musicbrainz.track t
      join musicbrainz.medium m
        on m.id = t.medium
      join musicbrainz.release r
        on r.id = m.release
      left join musicbrainz.release_group rg
        on rg.id = r.release_group
      left join musicbrainz.recording rec
        on rec.id = t.recording
      join musicbrainz.artist_credit tac
        on tac.id = t.artist_credit
      left join lateral (
        select acn.artist as artist_id
        from musicbrainz.artist_credit_name acn
        where acn.artist_credit = t.artist_credit
        order by acn.position asc
        limit 1
      ) first_artist on true
      left join lateral (
        select aa.name
        from musicbrainz.artist_alias aa
        where aa.artist = first_artist.artist_id
          and trim(coalesce(aa.name, '')) <> ''
        order by
          coalesce(aa.primary_for_locale, false) desc,
          length(aa.name) asc,
          aa.id asc
        limit 1
      ) artist_alias on true
      left join lateral (
        select ra.name
        from musicbrainz.release_alias ra
        where ra.release = r.id
          and trim(coalesce(ra.name, '')) <> ''
        order by
          coalesce(ra.primary_for_locale, false) desc,
          length(ra.name) asc,
          ra.id asc
        limit 1
      ) release_alias on true
      left join lateral (
        select tag.name
        from musicbrainz.recording_tag rt
        join musicbrainz.tag tag
          on tag.id = rt.tag
        where rt.recording = t.recording
        order by rt.count desc, tag.name asc
        limit 1
      ) genre_tag on true
      left join lateral (
        select
          rc.date_year,
          rc.date_month,
          rc.date_day
        from musicbrainz.release_country rc
        where rc.release = r.id
        order by
          nullif(rc.date_year, 0) asc nulls last,
          nullif(rc.date_month, 0) asc nulls last,
          nullif(rc.date_day, 0) asc nulls last
        limit 1
      ) release_country on true
      where r.id = any($1::int[])
      order by
        array_position($1::int[], r.id),
        m.position asc,
        t.position asc,
        t.id asc
    `, [releaseIds]);

    return rows;
  }

  async readDistractorTracks(input: {
    excludedReleaseIds: number[];
    targetCount: number;
  }) {
    if (input.targetCount <= 0) return [];

    const { rows } = await this.pool.query<MusicbrainzTrackRow>(`
      select
        t.id as mb_track_id,
        t.gid::text as mb_track_gid,
        t.name as track_name,
        tac.name as artist_name,
        first_artist.artist_id,
        r.id as release_id,
        r.gid::text as release_gid,
        r.name as release_name,
        rg.id as release_group_id,
        rg.gid::text as release_group_gid,
        rg.name as release_group_name,
        m.position as medium_position,
        t.position as track_position,
        coalesce(t.last_updated, rec.last_updated, r.last_updated) as last_updated,
        coalesce(rec.length, t.length) as duration_ms,
        null::text as genre_tag,
        null::text as release_alias,
        null::text as artist_alias,
        null::int as date_year,
        null::int as date_month,
        null::int as date_day
      from musicbrainz.track t
      join musicbrainz.medium m
        on m.id = t.medium
      join musicbrainz.release r
        on r.id = m.release
      left join musicbrainz.release_group rg
        on rg.id = r.release_group
      left join musicbrainz.recording rec
        on rec.id = t.recording
      join musicbrainz.artist_credit tac
        on tac.id = t.artist_credit
      left join lateral (
        select acn.artist as artist_id
        from musicbrainz.artist_credit_name acn
        where acn.artist_credit = t.artist_credit
        order by acn.position asc
        limit 1
      ) first_artist on true
      where trim(coalesce(t.name, '')) <> ''
        and trim(coalesce(tac.name, '')) <> ''
        and trim(coalesce(r.name, '')) <> ''
        and r.id <> all($1::int[])
        and (
          t.id % 37 = 0
          or t.id % 43 = 0
          or t.id % 53 = 0
        )
      order by t.id asc
      limit $2
    `, [input.excludedReleaseIds, input.targetCount]);

    return rows;
  }
}
