/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Backend al que el servidor de desarrollo redirige /api (no se expone al navegador).
  const apiProxyTarget = env.API_PROXY_TARGET || 'http://localhost:8080'
  // El login con Microsoft vuelve a VITE_MSAL_REDIRECT_URI: el servidor usa ese mismo puerto.
  const redirectPort = env.VITE_MSAL_REDIRECT_URI ? new URL(env.VITE_MSAL_REDIRECT_URI).port : ''
  const port = Number(env.PORT || redirectPort || 3000)

  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      css: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@services': path.resolve(__dirname, './src/services'),
        '@context': path.resolve(__dirname, './src/context'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@types': path.resolve(__dirname, './src/types'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@config': path.resolve(__dirname, './src/config'),
        '@constants': path.resolve(__dirname, './src/constants'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          // Librerías en chunks propios: cambian poco y el navegador las mantiene en caché.
          codeSplitting: {
            groups: [
              { name: 'vendor-msal', test: /node_modules[\\/]@azure[\\/]/ },
              {
                name: 'vendor-react',
                test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              },
              { name: 'vendor', test: /node_modules[\\/]/ },
            ],
          },
        },
      },
    },
    server: {
      port,
      // Si el puerto está ocupado, fallar en vez de cambiar de puerto y romper el login con Microsoft.
      strictPort: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
