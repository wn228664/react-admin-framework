/**
 * 模块职责：验证缓存目录清空、短暂初始化和显式 noCache 三种状态不会复用错误实例。
 * 仅检查缓存条目所有权；真实标签刷新和组件重建另由运行态验证。
 */
/**
 * `syncKeepAliveCacheEntries`：同步内容区缓存条目：保留仍在 cachedViews 中的历史页面，并仅在激活页未有条目时插入初始快照。
 */
import { syncKeepAliveCacheEntries } from '../utils';

// entries：两个旧缓存实例的位置快照；测试不得因为空许可目录而无条件保留全部旧页面。
const entries = [
  {
    cacheKey: '/a',
    routeName: '/a',
    locationSnapshot: { pathname: '/a', key: 'first-a', search: '', hash: '', state: undefined },
  },
  {
    cacheKey: '/b',
    routeName: '/b',
    locationSnapshot: { pathname: '/b', key: 'first-b', search: '', hash: '', state: undefined },
  },
];

/**
 * 刷新中转不缓存且目录为空时必须释放全部非活动页，旧实例不能残留。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('an empty cache directory releases inactive pages during a transient refresh route', () => {
  expect(
    syncKeepAliveCacheEntries({
      entries,
      cachedViews: [],
      activeConfig: { cacheKey: '/redirect/a', routeName: '/redirect/a', shouldCache: false },
    })
  ).toEqual([]);
});

/**
 * 许可目录尚未发布时只保留当前可缓存页及首份快照，不能保留其它历史项。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('a not-yet-published cache directory can retain only the current cacheable page with its first location', () => {
  expect(
    syncKeepAliveCacheEntries({
      entries,
      cachedViews: [],
      activeConfig: { cacheKey: '/a', routeName: '/a', shouldCache: true },
      locationSnapshot: { pathname: '/a', key: 'later-a' },
    })
  ).toEqual([entries[0]]);
});

/**
 * 当前页明确 noCache 且已撤销许可时，同路径旧缓存也必须卸载。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('explicit noCache releases the same-path old instance when its cache permission is gone', () => {
  expect(
    syncKeepAliveCacheEntries({
      entries,
      cachedViews: [],
      activeConfig: { cacheKey: '/a', routeName: '/a', shouldCache: false },
    })
  ).toEqual([]);
});

// ───── 模块结束：src/components/RouteKeepAliveOutlet/__tests__/refresh.test.js ─────
