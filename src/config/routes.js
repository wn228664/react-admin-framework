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
      ...menuRoutes,
      { path: '*', component: '@/pages/NotFound', meta: { noCache: true } },
    ],
  },
];
