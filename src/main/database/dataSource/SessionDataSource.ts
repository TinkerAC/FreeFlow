import { SessionRecord } from '@main/database/record/SessionRecord';
import { OS } from '@main/core/enum/Platform';

export interface SessionDataSource {
  createSession(
    startAt: Date,
    platform?: OS,
    appVersion?: string,
  ): Promise<SessionRecord>;
}