import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react','react-dom','react-router-dom',
      'framer-motion',
      'react-dnd','react-dnd-html5-backend',
      '@dnd-kit/core','@dnd-kit/sortable','@dnd-kit/utilities',
      'i18next','react-i18next',
      'react-markdown','remark-gfm'
    ],
    exclude: ['react-syntax-highlighter', 'prismjs', 'mermaid']
  },
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          dnd: ['react-dnd', 'react-dnd-html5-backend', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          motion: ['framer-motion'],
          i18n: ['i18next', 'react-i18next'],
          syntax: ['react-syntax-highlighter', 'prismjs'],
          markdown: ['react-markdown', 'remark-gfm']
        }
      }
    }
  },
  publicDir: 'public'
})