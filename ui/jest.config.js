module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.js$': 'babel-jest',
    '^.+\\.ts$': 'ts-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(vuetify|@vue/test-utils|vue3-simple-icons)/)',
  ],
  moduleFileExtensions: ['js', 'json', 'vue', 'ts'],
  extensionsToTreatAsEsm: ['.vue'],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/tests/mocks/svgMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@vue/test-utils$': '<rootDir>/node_modules/@vue/test-utils/dist/vue-test-utils.cjs.js'
  },
  cache: false,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,vue,ts}',
    '!src/main.ts',
    '!src/registerServiceWorker.js',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  // not blocking the build for now
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80
  //   }
  // },
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};