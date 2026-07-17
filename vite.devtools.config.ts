import { defineConfig } from 'vite'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
    build: {
        outDir: 'dist/firefox',
        sourcemap: command === 'serve' ? 'inline' : false,
        emptyOutDir: false,
        minify: command === 'serve' ? false : true,
        rollupOptions: {
            input: {
                devtools: path.resolve(__dirname, 'devtools.html')
            }
        }
    }
}))
