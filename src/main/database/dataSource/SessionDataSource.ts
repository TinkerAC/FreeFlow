import { SessionRecord } from '@main/database/record/SessionRecord';

import { OS } from '@src/shared/OS';

export interface SessionDataSource {
  createSession(
    startAt: Date,
    platform?: OS,
    appVersion?: string,
  ): Promise<SessionRecord>;
}