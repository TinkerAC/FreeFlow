import { SessionDataSource } from '@main/database/dataSource/SessionDataSource';
import { SessionRecord } from '@main/database/record/SessionRecord';
import { OS } from '@main/core/enum/Platform';
import { Session } from '@main/database/seqimpl/Session';

export class SessionDataSourceImpl implements SessionDataSource {
  async createSession(startAt: Date, operating_system?: OS, appVersion?: string): Promise<SessionRecord> {
    const ret = await Session.create({
      start_at: startAt,
      operating_system: operating_system,
      app_version: appVersion,
    });
    return Object.assign(new SessionRecord(), ret.get({ plain: true }));
  }

}