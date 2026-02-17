import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-plugin-prettier/recommended';

export default defineConfig([
    // 1. Global Ignores (Must be the first object)
    {
        ignores: ['coverage/**/*', 'dist/**/*', 'node_modules/**/*'],
    },

    // 2. Base JS & TS Recommended
    js.configs.recommended,
    ...tseslint.configs.recommended,

    // 3. Prettier (Turns off conflicting rules)
    prettier,

    // 4. Project-specific TypeScript settings
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            // 1. Completely Disable
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-require-imports': 'off',

            // 2. Downgrade to Warnings (the "Info" equivalent)
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-empty-object-type': 'warn',

            // 3. Special handling for @ts-ignore comments
            '@typescript-eslint/ban-ts-comment': 'warn',
        },
    },

    // 5. Jest configuration
    {
        files: ['**/*.test.ts', '**/*.spec.ts'],
        plugins: {
            jest,
        },
        languageOptions: {
            globals: {
                ...jest.environments.globals.globals,
            },
        },
    },
]);
