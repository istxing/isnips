import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        'main/index': 'src/main/index.ts',
        'preload/index': 'src/preload/index.ts',
    },
    format: ['cjs'],
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    external: ['electron', 'better-sqlite3'],
    noExternal: ['electron-store'],
    outDir: 'dist',
})
