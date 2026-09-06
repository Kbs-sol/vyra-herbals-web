/**
 * Merge the relevant bits of this into your existing jest.config.js if one
 * exists. Key requirement: a '@/*' -> 'src/*' (or your existing alias)
 * moduleNameMapper, since every file in this module imports via '@/...'.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src', '<rootDir>/app'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/*.test.ts'],
};
