import { AbstractRecord } from '@main/database/record/AbstractRecord';
import { OS } from '@main/core/enum/Platform';
import { AbstractEntity } from '@src/shared/domainModel/AbstractEntity';
import { NotImplementedError } from '@main/core/exceptions/NotImplementedError';

/**
 * SessionRecordProps 定义了会话表的所有持久化字段。
 */
export interface SessionRecordProps {
  /** 会话主键（自增） */
  session_id: number;
  /** 会话开始时间（应用启动时间） */
  start_at: Date;
  /** 运行平台，可空 */
  operating_system?: OS;
  /** 应用版本号，可空 */
  app_version?: string;
  /** 记录创建时间，由 ORM 自动维护 */
  created_at?: Date;
  /** 记录更新时间，由 ORM 自动维护 */
  modified_at?: Date;
}

/**
 * SessionRecord 用于持久化 SessionEntity 至数据库。
 */
export class SessionRecord
  extends AbstractRecord
  implements SessionRecordProps {

  session_id!: number;
  start_at!: Date;
  operating_system?: OS;
  app_version?: string;
  created_at?: Date;
  modified_at?: Date;

  toEntity(): AbstractEntity {
    throw NotImplementedError;
  }

}
