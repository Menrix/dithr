import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import fs from 'node:fs';

const deviceImagesList = fs.readdirSync('./static/images/devices').map(item => item.split('.')[0]);

export default defineConfig({
    define: {
        __GIT_HASH__: JSON.stringify(execSync('git rev-parse --short HEAD').toString().trimEnd()),
        __DEVICE_IMAGES__: JSON.stringify(deviceImagesList),
    },
    plugins: [
        tailwindcss(),
        sveltekit(),
    ],
});
