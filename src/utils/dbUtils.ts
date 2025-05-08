/**
 * 从 obj 中只挑选 keys 列表里的字段，返回类型为 T
 */

import { Model } from 'sequelize';

/**
 * 把一个 Sequelize Model instance 转成纯数据对象 R
 */
export function toRecord<R>(model: Model<any, any>): R {
  // plain: true 表示「去掉所有 Sequelize 自带的方法和元数据」
  return model.get({ plain: true }) as unknown as R;
}

