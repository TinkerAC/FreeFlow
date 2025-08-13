import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './database';
import { Platform } from '@main/core/enum/Platform';
import { OS } from '@src/shared/OS';

/**
 * SessionRecordProps 定义了 Session 表的所有字段。
 */
export interface SessionRecordProps {
  /** 会话自增主键 */
  session_id: number;
  /** 启动（会话开始）时间，必填 */
  start_at: Date;
  /** 运行平台（Windows / macOS / Linux / Web 等），可选 */
  operating_system?: OS;
  /** 应用版本，用于后期统计升级效果，可选 */
  app_version?: string;
  /** 创建时间，由 Sequelize 自动维护 */
  created_at?: Date;
  /** 更新时间，由 Sequelize 自动维护 */
  modified_at?: Date;
}

export interface SessionCreationAttributes extends Optional<
  SessionRecordProps,
  | 'session_id'
  | 'operating_system'
  | 'app_version'
  | 'created_at'
  | 'modified_at'
> {
}

export class Session
  extends Model<SessionRecordProps, SessionCreationAttributes>
  implements SessionRecordProps {
  public session_id!: number;
  public start_at!: Date;
  public operating_system?: OS;
  public app_version?: string;
  public created_at?: Date;
  public modified_at?: Date;
}

Session.init(
  {
    session_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    start_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    operating_system: DataTypes.TEXT,
    app_version: DataTypes.TEXT,
  },
  {
    sequelize,
    tableName: 'sessions',
    /**
     * 启用 Sequelize 内置的时间戳自动维护。
     * createdAt -> created_at
     * updatedAt -> modified_at
     */
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'modified_at',
    indexes: [
      {
        fields: ['start_at'],
        name: 'idx_start_at',
      },
    ],
  },
);
