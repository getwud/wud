/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
        // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: {
                    module: 'ESNext',
                    moduleResolution: 'node',
                },
            },
        ],
        '^.+\\.jsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: {
                    allowJs: true,
                },
            },
        ],
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    extensionsToTreatAsEsm: ['.ts'],
    transformIgnorePatterns: [
        'node_modules/(?!(oauth4webapi|openid-client|jose)/)',
    ],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        '**/*.{js,ts}',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**',
        '!jest.config.cjs',
    ],
    testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
};
