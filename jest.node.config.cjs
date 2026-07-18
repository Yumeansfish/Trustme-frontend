module.exports = {
  displayName: 'node',
  testEnvironment: 'node',
  collectCoverage: false,
  testMatch: ['<rootDir>/test/**/*.test.node.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^~/(.+)$': '<rootDir>/src/$1',
    '^@/(.+)$': '<rootDir>/src/$1',
    '^d3$': '<rootDir>/node_modules/d3/dist/d3.min.js',
  },
  moduleFileExtensions: ['js', 'ts', 'json'],
};
