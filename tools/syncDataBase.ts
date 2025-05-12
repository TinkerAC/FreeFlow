import { Sequelize } from 'sequelize';


const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: '/Users/tinker/WebstormProjects/FreeFlow/data/database.sqlite', // Update this to your database path
  logging: true,
});


sequelize.sync(
  { force: false, alter: true, logging: false },  // 是否强制同步数据库
).then(
  console.log
)