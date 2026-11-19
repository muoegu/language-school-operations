import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => ({
  // Neon CLI writes the local connection values to the repository root.
  envDir: '..',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    ...(mode === 'development' ? [vueDevTools()] : []),
    vue(),
    ui({
      colorMode: false,
      icon: {
        clientBundle: {
          scan: true,
        },
      },
      ui: {
        colors: {
          primary: 'sky',
          neutral: 'slate',
        },
      },
    }),
    cloudflare(),
  ],
}))
