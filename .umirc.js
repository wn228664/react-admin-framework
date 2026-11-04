/**
 * 模块职责：声明 Umi 的页面路由、Dva 插件、资源哈希与浏览器构建目标。
 * API_BASE_URL 是公开编译配置，缺省 /api；开发代理只有显式配置目标才启用，不包含默认业务服务。
 * 修改 routes、目标浏览器或拆包策略后需要重新构建并检查深链接和资源路径。
 */
// Umi defineConfig 提供配置装配入口，保持插件和构建选项使用同一份声明。
/**
 * `defineConfig`：装配 Umi 构建、路由与插件配置；公开 define 值会进入客户端产物。
 */
import { defineConfig } from 'umi';
// 路由树同时供构建器和菜单消费，避免路径、标题与缓存身份分别配置。
/**
 * `routes`：完整中性静态路由配置，供路由装配或动态目录未命中时兜底。
 */
import routes from './src/config/routes';

export default defineConfig({
  title: 'React Admin Framework',
  favicons: ['/favicon.svg'],
  // 只有公开 API 基址注入浏览器代码，不能在这里放私钥、密码或访问凭证。
  define: { API_BASE_URL: process.env.API_BASE_URL || '/api' },
  plugins: ['@umijs/plugins/dist/dva'],
  dva: { immer: {}, hmr: {} },
  routes,
  // 代理只属于本地开发环境；生产需要部署层提供 /api 路由或显式可信基址。
  proxy: process.env.DEV_PROXY_TARGET
    ? {
        '/api': { target: process.env.DEV_PROXY_TARGET, changeOrigin: true, pathRewrite: { '^/api': '' } },
      }
    : {},
  theme: { 'primary-color': '#1890ff' },
  // 目标是 Chrome 100 及以上语法/能力范围，原生兼容性仍需实际浏览器验证。
  targets: { chrome: 100 },
  hash: true,
  fastRefresh: true,
  ignoreMomentLocale: true,
  jsMinifier: 'esbuild',
  cssMinifier: 'esbuild',
  codeSplitting: { jsStrategy: 'granularChunks' },
  mfsu: false,
});

// ───── 模块结束：.umirc.js ─────
