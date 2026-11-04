/**
 * Unit-test config (package.json has "type": "module", so this must be .cjs).
 * Run: npm test
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { diagnostics: false, tsconfig: { module: 'commonjs', moduleResolution: 'node', esModuleInterop: true, target: 'ES2020', jsx: 'react-jsx', isolatedModules: true } },
    ],
  },
};
