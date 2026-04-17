# FreeFlow Search and Recommendation Design

This document describes a practical search and recommendation design for FreeFlow. It is written for implementation planning and can be adapted into the thesis chapter about retrieval, ranking and recommendation.

## Goals

FreeFlow has two search domains:

1. Local desktop library: tracks imported or downloaded into SQLite.
2. Web2.5 indexed resources: published on-chain releases synchronized by the backend.

The recommendation system should improve discovery without requiring invasive data collection. The first production version can use deterministic ranking plus lightweight behavioral signals, then evolve into embedding-based retrieval.

## Data Collection

Collect only product-relevant events and keep the schema explicit.

Recommended desktop events:

| Event | Fields | Purpose |
| --- | --- | --- |
| `search_submitted` | query, timestamp, source view | Query analysis and popularity |
| `search_result_clicked` | query, resource key, rank, timestamp | Click-through ranking signal |
| `track_play_started` | track id/resource key, source, timestamp | Interest signal |
| `track_play_completed` | track id/resource key, played seconds, duration | Strong positive signal |
| `track_skipped` | track id/resource key, played seconds | Negative or weak signal |
| `track_added_to_library` | resource key, playlist id | Strong positive signal |
| `track_downloaded` | resource key, cid | Offline intent signal |
| `comment_created` | resource key, user id | Engagement signal |

Recommended backend resource fields:

| Field | Source | Purpose |
| --- | --- | --- |
| title | release metadata | lexical search |
| artist | release metadata | lexical search and artist affinity |
| album | release metadata | lexical search |
| genre | release metadata | category ranking |
| lyrics | embedded ID3 / metadata JSON | full text and semantic retrieval |
| chain id, contract, token id | publishing flow | stable resource identity |
| content CID | Pinata upload | storage identity |
| creator user id | SIWE session | creator affinity |
| publish timestamp | release status | freshness ranking |

Privacy baseline:

- Store wallet addresses only where needed for ownership and access checks.
- Prefer aggregated counters for ranking.
- Keep raw interaction events short-lived if they are not required for audit.
- Separate local-only desktop behavior from backend behavior unless the user opts in.

## Search Pipeline

### Query Normalization

Normalize each query before searching:

- trim whitespace;
- lowercase ASCII text;
- normalize full-width and half-width punctuation;
- remove repeated spaces;
- generate pinyin tokens for Chinese titles/artists;
- keep original query for exact matching.

### Candidate Retrieval

Use multiple candidate sources and merge them:

1. Exact match: title, artist, album, token id, CID, resource key.
2. Fuzzy lexical match: SQLite `LIKE` locally and PostgreSQL `contains`/`insensitive` in backend.
3. Provider search: NetEase/FreeFlow provider results, normalized into `TrackEntity`.
4. Optional lyrics search: lyrics text index for phrase matches.
5. Optional vector search: embedding similarity over title, artist, genre, description and lyrics.

### Ranking Formula

A deterministic ranking score is enough for the first thesis implementation:

```text
score =
  4.0 * exact_title_match +
  3.0 * exact_artist_match +
  2.0 * title_prefix_match +
  1.5 * artist_prefix_match +
  1.2 * genre_match +
  1.0 * lyrics_phrase_match +
  0.8 * normalized_text_similarity +
  0.6 * freshness_score +
  0.6 * local_play_affinity +
  0.4 * global_popularity
```

Where:

- `normalized_text_similarity` can use Levenshtein distance for short strings and token overlap for longer strings.
- `freshness_score` decays by publish date.
- `local_play_affinity` comes from local play count, completion rate and playlist additions.
- `global_popularity` comes from backend aggregate plays, comments, purchases or library adds.

The current `LyricService` already uses Levenshtein sorting for fallback lyric candidate selection. That idea can be reused in search ranking: compare the query with `title + artist`, then use the distance as one ranking feature instead of the only criterion.

## Recommendation Pipeline

### Content-Based Recommendation

Build item vectors from:

- title tokens;
- artist tokens;
- album tokens;
- genre labels;
- lyrics keywords;
- creator id;
- access model;
- release age.

For a user/session profile, aggregate vectors from:

- completed plays;
- repeated plays;
- playlist additions;
- downloads;
- purchases;
- comments.

Then recommend tracks with high cosine similarity to the user vector, excluding already skipped or recently played tracks.

### Collaborative Signals

When enough backend data exists, add item-item co-occurrence:

- tracks added by the same wallet/profile;
- tracks played in the same session;
- tracks downloaded together;
- tracks commented on by overlapping users.

This can start as a simple co-occurrence table:

```text
item_similarity(A, B) =
  co_play_count(A, B) * 1.0 +
  co_library_add_count(A, B) * 2.0 +
  co_purchase_count(A, B) * 3.0
```

Normalize by item popularity to avoid always recommending the most popular tracks.

### Hybrid Ranking

Final recommendation score:

```text
final_score =
  0.45 * content_similarity +
  0.25 * collaborative_similarity +
  0.15 * freshness_score +
  0.10 * creator_affinity +
  0.05 * diversity_bonus
```

Diversity should prevent the list from being dominated by one artist or one genre. A simple Maximal Marginal Relevance pass works:

```text
MMR(item) = lambda * relevance(item) - (1 - lambda) * max_similarity_to_selected(item)
```

Use `lambda = 0.75` for discovery pages and `lambda = 0.9` for direct search result pages.

## Backend Implementation Plan

Recommended tables:

| Table | Purpose |
| --- | --- |
| `search_events` | query and click analytics |
| `resource_play_events` | play, completion and skip signals |
| `resource_popularity_daily` | daily aggregate counters |
| `resource_embeddings` | optional vector representation |
| `resource_recommendation_cache` | precomputed recommendation lists |

Recommended indexes:

- `resources(resourceKey)`;
- `resources(title)`;
- `creator_releases(artistName, albumName, genreLabel)`;
- full-text index over title, artist, album, genre, description and lyrics if lyrics are stored server-side;
- vector index if using pgvector later.

## Desktop Implementation Plan

Local search should merge:

1. SQLite library results;
2. backend Web2.5 resources;
3. provider search results.

The desktop already has `SearchService`, provider managers and FreeFlow resource search. The next step is to expose a structured search result with rank reasons:

```ts
type RankedSearchResult = {
  track: TrackEntity;
  score: number;
  source: 'local' | 'web25' | 'provider';
  reasons: string[];
};
```

This makes the ranking explainable in the thesis and debuggable in the UI.

## Evaluation

Offline metrics:

- Mean Reciprocal Rank for known target queries;
- nDCG@10 for hand-labeled search relevance;
- click-through rate by rank;
- completion rate for recommended tracks;
- diversity by artist/genre distribution.

Online metrics:

- search-to-play conversion;
- search-to-library-add conversion;
- recommendation play completion;
- skip rate;
- download or purchase conversion for Web2.5 resources.

## Thesis Summary

FreeFlow can implement search recommendation as a hybrid retrieval system:

- lexical search handles precise intent;
- fuzzy matching handles noisy input and multilingual names;
- lyrics and metadata expand semantic coverage;
- behavioral signals personalize ranking;
- on-chain and IPFS identifiers provide stable resource identity;
- diversity reranking improves discovery quality.

This design is incremental: the first version can be implemented with SQLite/PostgreSQL queries and deterministic scoring, while later versions can add embeddings, pgvector and precomputed recommendation caches.
