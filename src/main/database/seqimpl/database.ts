// src/main/database/database.ts
import { Sequelize } from 'sequelize';
import { db_Path } from '@main/core/PathConfig';
import sqlite3 from 'sqlite3';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  dialectModule: sqlite3,
  storage: db_Path,
  logging: false,
});


