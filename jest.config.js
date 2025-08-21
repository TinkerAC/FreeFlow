// jest.configContext.js
module.exports = {
  preset: 'ts-jest', // 使用 ts-jest 预设
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest', // 告诉 Jest 用 ts-jest 处理 ts/tsx 文件
  },
  moduleNameMapper: {
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    '^@components/(.*)$': '<rootDir>/src/renderer/components/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@renderer/(.*)$': '<rootDir>/src/renderer/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};