import fs from 'node:fs';
import { pathsToModuleNameMapper } from 'ts-jest';

const tsconfig = JSON.parse(fs.readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf-8'));

const moduleNameMapper = pathsToModuleNameMapper(tsconfig.compilerOptions?.paths ?? {}, {
    prefix: '<rootDir>/'
});

export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'jsdom',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    roots: ['<rootDir>/src'],
    moduleDirectories: ['node_modules', '<rootDir>/src'],
    moduleNameMapper: {
        '^.+\\.(css|scss|sass)$': 'identity-obj-proxy',
        '^(\\.{1,2}/.*)\\.js$': '$1',
        ...moduleNameMapper
    },
    transform: {
        '^.+\\.(t|j)sx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: './tsconfig.json',
                diagnostics: {
                    warnOnly: true
                }
            }
        ]
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
};
