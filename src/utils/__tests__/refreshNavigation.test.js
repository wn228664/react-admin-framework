/**
 * 模块职责：验证刷新中转路由已注册并且只返回站内合法目标，保留普通查询/hash。
 * 使用完整静态路由配置而非复制路径声明；防止后续清理再次留下无法执行的刷新入口。
 */
/**
 * `routes`：完整中性静态路由配置，供路由装配或动态目录未命中时兜底。
 */
import routes from '@/config/routes';
/**
 * `resolveRefreshTarget`：从保留的 /redirect/* 中转路径中还原待刷新的站内页面，拒绝递归或来源歧义。
 */
import { resolveRefreshTarget } from '../nav';

/**
 * 真实刷新中转路由必须先于通配 404 注册，并明确隐藏及禁止缓存。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('the refresh route is hidden, non-cacheable and precedes the catch-all page', () => {
  // layoutRoutes：实际根布局子树，用它核对刷新路由配置而非测试自己构造的声明。
  const layoutRoutes = routes[0].routes;
  // refreshIndex：刷新中转入口在真实路由表的位置，必须先于通配 404。
  const refreshIndex = layoutRoutes.findIndex(
    (/* route：当前真实子路由声明。 */ route) => route.path === '/redirect/*'
  );
  expect(refreshIndex).toBeGreaterThan(-1);
  expect(refreshIndex).toBeLessThan(
    layoutRoutes.findIndex((/* route：通配兜底声明候选。 */ route) => route.path === '*')
  );
  expect(layoutRoutes[refreshIndex]).toMatchObject({
    component: '@/pages/Redirect',
    hidden: true,
    meta: { noCache: true },
  });
});

/**
 * 刷新只恢复合法站内地址，保留普通查询/片段并拒绝外部、反斜杠、控制字符与递归中转。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('refresh targets preserve ordinary local query/hash and reject external or recursive destinations', () => {
  expect(resolveRefreshTarget({ pathname: '/redirect/components', search: '?tab=ui', hash: '#search' })).toBe(
    '/components?tab=ui#search'
  );
  expect(resolveRefreshTarget({ pathname: '/redirect//example.com' })).toBe('/dashboard');
  expect(resolveRefreshTarget({ pathname: '/redirect/\\example.com' })).toBe('/dashboard');
  expect(resolveRefreshTarget({ pathname: '/redirect/redirect/components' })).toBe('/dashboard');
  expect(resolveRefreshTarget({ pathname: '/redirect/components', search: '\ninvalid' })).toBe('/dashboard');
});

// ───── 模块结束：src/utils/__tests__/refreshNavigation.test.js ─────
