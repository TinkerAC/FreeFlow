// src/main/models/database.ts
import { Sequelize } from 'sequelize';
import { dbPath } from '@main/app/pathConfig';
import sqlite3 from "sqlite3"

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  dialectModule: sqlite3,
  storage: dbPath,
  logging: false,
});
