import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import path from 'path'

export default defineConfig({
    plugins: [
        react(),
        UnoCSS(),
    ],
    root: 'src/renderer',
    base: './',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src/renderer/src'),
            '@shared': path.resolve(__dirname, 'src/shared'),
        },
    },
    build: {
        outDir: '../../dist/renderer',
        emptyOutDir: true,
    },
    server: {
        port: 3000,
    },
})
