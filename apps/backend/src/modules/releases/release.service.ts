import { createCreatorRelease } from './use-cases/create-creator-release.js';
import { getCreatorRelease } from './use-cases/get-creator-release.js';
import { listCreatorReleases } from './use-cases/list-creator-releases.js';
import { updateCreatorRelease } from './use-cases/update-creator-release.js';
import type { CreateCreatorReleaseInput, UpdateCreatorReleaseInput } from './release.schemas.js';

/**
 * release service 现在只扮演模块门面角色。
 * 具体业务流程已拆到 `use-cases`，方便继续扩展上传、元数据、链上发布等子流程。
 */
export class ReleaseService {
  async listCreatorReleases(creatorUserId: string) {
    return listCreatorReleases(creatorUserId);
  }

  async createCreatorRelease(creatorUserId: string, input: CreateCreatorReleaseInput) {
    return createCreatorRelease(creatorUserId, input);
  }

  async getCreatorRelease(creatorUserId: string, releaseId: string) {
    return getCreatorRelease(creatorUserId, releaseId);
  }

  async updateCreatorRelease(creatorUserId: string, releaseId: string, input: UpdateCreatorReleaseInput) {
    return updateCreatorRelease(creatorUserId, releaseId, input);
  }
}

export const releaseService = new ReleaseService();
