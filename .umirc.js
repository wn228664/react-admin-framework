import { defineConfig } from 'umi';
import routes from './src/config/routes';

export default defineConfig({
  title: 'React Admin Framework',
  favicons: ['/favicon.svg'],
  define: { API_BASE_URL: process.env.API_BASE_URL || '/api' },
  plugins: ['@umijs/plugins/dist/dva'],
  dva: { immer: {}, hmr: {} },
  routes,
  proxy: process.env.DEV_PROXY_TARGET ? {
    '/api': { target: process.env.DEV_PROXY_TARGET, changeOrigin: true, pathRewrite: { '^/api': '' } },
  } : {},
  theme: { 'primary-color': '#1890ff' },
  targets: { chrome: 100 },
  hash: true,
  fastRefresh: true,
  ignoreMomentLocale: true,
  jsMinifier: 'esbuild',
  cssMinifier: 'esbuild',
  codeSplitting: { jsStrategy: 'granularChunks' },
  mfsu: false,
});
