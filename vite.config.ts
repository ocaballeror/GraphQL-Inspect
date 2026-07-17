import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
    build: {
        outDir: 'dist/firefox',
        sourcemap: command === 'serve' ? ('inline' as const) : false,
        emptyOutDir: false,
        minify: command === 'serve' ? false : true,
        chunkSizeWarningLimit: 2000,
    },
    plugins: [
        react(),
    ]
}))
