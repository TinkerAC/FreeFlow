// src/main/database/database.ts
import { Sequelize } from 'sequelize';
import { AppDataPath } from '@main/core/PathConfig';
import sqlite3 from 'sqlite3';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  dialectModule: sqlite3,
  storage: AppDataPath.dbPath,
  logging: false,
});

