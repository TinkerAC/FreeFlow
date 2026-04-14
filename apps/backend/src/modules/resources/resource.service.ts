import { AppError } from '../../core/errors/app-error.js';
import { mapResourceRecord } from './resource.mapper.js';
import { resourceRepository } from './resource.repository.js';

/**
 * 资源检索服务。
 */
export class ResourceService {
  async searchTracks(keyword: string, limit: number) {
    const records = await resourceRepository.searchPublishedTracks(keyword, limit);
    return {
      items: records.map((record) => mapResourceRecord(record)),
    };
  }

  async resolveTrack(resourceKey: string) {
    const record = await resourceRepository.findPublishedTrackByResourceKey(resourceKey);
    if (!record) {
      throw new AppError(404, 'Resource not found', 'RESOURCE_NOT_FOUND', {
        resourceKey,
      });
    }
    return mapResourceRecord(record);
  }
}

export const resourceService = new ResourceService();
