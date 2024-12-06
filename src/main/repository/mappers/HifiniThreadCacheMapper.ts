import { HifiniThreadCache } from '@main/models/HifiniThreadCache';
import { HifiniThreadCacheModel } from '@src/shared/types';

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
      cached_at: hifiniThreadCache.cached_at,
      modified_at: hifiniThreadCache.modified_at,
    };
  }
}