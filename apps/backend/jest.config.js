module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\.spec\.ts$',
  coverageDirectory: '../coverage',
  collectCoverageFrom: ['**/*.(t|j)s'],
};
