module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testTimeout: 10000,
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/src/config/',
        '/src/types/'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};