import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        outDir: 'dist/firefox',
        sourcemap: 'inline' as const,
        emptyOutDir: false,
        minify: false,
    },
    plugins: [
        react(),
    ]
})
