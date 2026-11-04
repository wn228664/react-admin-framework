/**
 * 模块职责：定义可独立启动的首页、通用组件和 404 路由，并提供菜单使用的同一份中性配置。
 * name 同时参与标签和缓存身份；path 参与 history、面包屑和菜单匹配，修改时应同步核对这些消费者。
 * meta 仅描述客户端展示，不替代服务端授权；新增页面按真实模块接入，不放业务服务地址。
 */
// 菜单只列出正常页面；根重定向和通配 404 保留在下面的路由外壳，避免出现在搜索结果。
// `menuRoutes`：供菜单与完整路由共同消费的中性页面目录；只含首页和组件验收页，不含重定向、中转或通配兜底。
export const menuRoutes = [
  {
    path: '/dashboard',
    component: '@/pages/Home',
    name: 'Home',
    meta: { title: '首页', icon: 'HomeOutlined', affix: true },
  },
  {
    path: '/components',
    component: '@/pages/Components',
    name: 'Components',
    meta: { title: '通用组件', icon: 'AppstoreOutlined' },
  },
];

export default [
  {
    path: '/',
    component: '@/layouts/BasicLayout',
    routes: [
      { path: '/', redirect: '/dashboard' },
      // 刷新中转必须位于通配 404 前；不进入菜单/页签缓存，返回目标由页面限制为站内地址。
      { path: '/redirect/*', component: '@/pages/Redirect', hidden: true, meta: { noCache: true } },
      ...menuRoutes,
      { path: '*', component: '@/pages/NotFound', meta: { noCache: true } },
    ],
  },
];

// ───── 模块结束：src/config/routes.js ─────
