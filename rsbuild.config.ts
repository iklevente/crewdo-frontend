import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const { parsed } = loadEnv();
const apiBaseUrl = parsed.API_BASE_URL ?? process.env.API_BASE_URL ?? '';

export default defineConfig({
    plugins: [pluginReact()],
    source: {
        define: {
            'process.env.API_BASE_URL': JSON.stringify(apiBaseUrl)
        }
    }
});
