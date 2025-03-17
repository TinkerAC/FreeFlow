// jest.config.js
module.exports = {
  preset: 'ts-jest', // 使用 ts-jest 预设
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest', // 告诉 Jest 用 ts-jest 处理 ts/tsx 文件
  },
};