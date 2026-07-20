module.exports = {
  globalSetup: '@dcloudio/uni-automator/dist/setup.js',
  globalTeardown: '@dcloudio/uni-automator/dist/teardown.js',
  testEnvironment: '@dcloudio/uni-automator/dist/environment.js',
  testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
  testTimeout: 30000,
  reporters: ['default'],
}
