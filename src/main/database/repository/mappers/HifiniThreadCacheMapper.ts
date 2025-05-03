import { HifiniThreadCache } from '@main/database/seqimpl/HifiniThreadCache';

import { HifiniThreadCacheModel } from '@src/shared/domainModel/hifiniThreadCacheModel';

export default class HifiniThreadCacheMapper {
  static toEntity(hifiniThreadCache: HifiniThreadCacheModel): HifiniThreadCache {
    return HifiniThreadCache.build({
      data_href: hifiniThreadCache.data_href,
      title: hifiniThreadCache.title,
      artist: hifiniThreadCache.artist,
      cover_src: hifiniThreadCache.cover_src,
      un_redirected_url: hifiniThreadCache.un_redirected_url,
      cached_at: hifiniThreadCache.cached_at,
      modified_at: hifiniThreadCache.modified_at,
    });
  }

  static toModel(hifiniThreadCache: HifiniThreadCache): HifiniThreadCacheModel {
    return {
      data_href: hifiniThreadCache.data_href,
      title: hifiniThreadCache.title,
      artist: hifiniThreadCache.artist,
      cover_src: hifiniThreadCache.cover_src,
      un_redirected_url: hifiniThreadCache.un_redirected_url,
      cached_at: hifiniThreadCache.cached_at
        ? new Date(hifiniThreadCache.cached_at)
        : undefined,
      modified_at: hifiniThreadCache.modified_at
        ? new Date(hifiniThreadCache.modified_at)
        : undefined,
    };
  }
}