/** @type {import('jest').Config} */
module.exports = {
  rootDir: '../..',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/integrations/codestra-social/**/*.spec.ts'],
  clearMocks: true,
};
