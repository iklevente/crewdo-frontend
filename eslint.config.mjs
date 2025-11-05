import { defineConfig } from 'eslint/config';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    {
        ignores: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/**/__tests__/**']
    },
    // Base JS recommended
    ...compat.extends('eslint:recommended'),
    // TypeScript ESLint recommended (flat config style)
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['src/api/**/*'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                ecmaVersion: 2020,
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                    impliedStrict: true
                }
            },
            globals: {
                ...globals.node,
                ...globals.jest,
                ...globals.browser
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...tseslint.configs['recommended-type-checked'].rules,
            ...tseslint.configs['stylistic-type-checked'].rules
        }
    },
    // React recommended (flat config style)
    {
        files: ['src/**/*.{js,jsx,ts,tsx}'],
        ignores: ['src/api/**/*'],
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            import: (await import('eslint-plugin-import')).default
        },
        settings: {
            react: {
                version: 'detect'
            },
            'import/resolver': {
                node: {
                    extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts']
                }
            }
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            // custom rules below
            'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
            '@typescript-eslint/prefer-optional-chain': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            '@typescript-eslint/naming-convention': [
                'error',
                { selector: 'enum', format: ['PascalCase'] },
                { selector: 'enumMember', format: ['PascalCase'] }
            ],
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'react-router-dom',
                            importNames: ['useHistory', 'useLocation'],
                            message: 'Use wrappers from src/appHistory.ts instead'
                        }
                    ]
                }
            ],
            '@typescript-eslint/explicit-function-return-type': [
                'error',
                { allowExpressions: true }
            ],
            'prefer-destructuring': ['error', { object: true, array: false }],
            'no-await-in-loop': 'error',
            curly: 'error',
            'import/order': [
                'error',
                { groups: [['external', 'builtin'], 'internal', ['parent', 'sibling', 'index']] }
            ]
        }
    }
]);
