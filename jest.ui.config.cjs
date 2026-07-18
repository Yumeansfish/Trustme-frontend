module.exports = {
  displayName: 'ui',
  testEnvironment: 'jsdom',
  collectCoverage: false,
  testMatch: ['<rootDir>/test/**/*.test.ui.ts'],
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^~/(.+)$': '<rootDir>/src/$1',
    '^@/(.+)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['js', 'ts', 'json', 'vue'],
};
