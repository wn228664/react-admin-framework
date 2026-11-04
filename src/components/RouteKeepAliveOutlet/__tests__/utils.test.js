/**
 * 模块职责：验证真实缓存 helper 的路径身份、noCache、布局子路由、首次位置快照和条目等价。
 * 只使用路由/位置对象，不创建 React 实例；动态路径保留为回归夹具，不接入任何业务服务。
 * 同路径后续 key/query 不替换首次缓存快照，避免已有页面意外重挂载；实例释放另由浏览器验证。
 */
/**
 * `areKeepAliveEntriesEqual`：判断两组缓存条目是否完全一致，避免组件层在无变化时重复 setState。
 * `buildKeepAliveLocationSnapshot`：构建一份稳定的 location 快照，让缓存页在切走后仍然绑定自己的路由上下文。
 * `resolveLayoutOutletRoutes`：提取根布局下的内容子路由，避免缓存场景递归渲染 BasicLayout。
 * `resolveRouteKeepAliveConfig`：以标准 pathname 统一缓存身份，并读取当前匹配页 meta.noCache；不依赖显示名称。
 * `syncKeepAliveCacheEntries`：同步内容区缓存条目：保留仍在 cachedViews 中的历史页面，并仅在激活页未有条目时插入初始快照。
 */
import {
  areKeepAliveEntriesEqual,
  buildKeepAliveLocationSnapshot,
  resolveLayoutOutletRoutes,
  resolveRouteKeepAliveConfig,
  syncKeepAliveCacheEntries,
} from '../utils';

describe('RouteKeepAliveOutlet utils', /**
 * 登记缓存身份、路由快照、资格同步与缓存表相等性用例；真实实例保留/销毁另由浏览器验证。
 * @returns {void}
 */ () => {
  /**
   * 当前缓存身份统一为标准 pathname，末路由 meta.noCache 明确拒绝缓存。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('should resolve keep-alive config from selected routes and cached views', () => {
    expect(
      resolveRouteKeepAliveConfig({
        selectedRoutes: [
          { route: { path: '/', name: 'Layout' } },
          { route: { path: '/system/dict/data/:dictId', name: 'SystemDictData', meta: {} } },
        ],
        pathname: '/system/dict/data/12',
      })
    ).toEqual({
      cacheKey: '/system/dict/data/12',
      routeName: '/system/dict/data/12',
      shouldCache: true,
    });

    expect(
      resolveRouteKeepAliveConfig({
        selectedRoutes: [{ route: { path: '/system/dict/data/:dictId', meta: { noCache: true } } }],
        pathname: '/system/dict/data/12/',
      })
    ).toEqual({
      cacheKey: '/system/dict/data/12',
      routeName: '/system/dict/data/12',
      shouldCache: false,
    });
  });

  /**
   * 只提取根布局下的内容子路由，避免把布局或根外登录入口递归缓存。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('should extract BasicLayout child routes from the client route tree', () => {
    // `layoutRoutes`：真实 helper 从根 Layout 中提取的内容目录，登录等根外入口不能混入缓存递归。
    const layoutRoutes = resolveLayoutOutletRoutes([
      { path: '/login', children: [] },
      {
        path: '/',
        routes: [
          { path: '/', redirect: '/dashboard' },
          { path: '/dashboard', name: 'Dashboard' },
        ],
      },
    ]);

    expect(layoutRoutes).toEqual([
      { path: '/', redirect: '/dashboard' },
      { path: '/dashboard', name: 'Dashboard' },
    ]);
  });

  /**
   * 位置快照保留 query/hash/state/key，同时规范 pathname 尾斜杠。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('should build stable location snapshots for cached route entries', () => {
    expect(
      buildKeepAliveLocationSnapshot({
        pathname: '/examples/list/',
        search: '?page=2',
        hash: '#anchor',
        state: { tab: 'examples' },
        key: 'examples-2',
      })
    ).toEqual({
      pathname: '/examples/list',
      search: '?page=2',
      hash: '#anchor',
      state: { tab: 'examples' },
      key: 'examples-2',
    });
  });

  /**
   * 新增缓存固定首份快照，同路径导航保留实例，撤销非活动许可后删除条目。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('should add, update and prune cache entries according to cachedViews', () => {
    // `entries`：首次进入 /examples/list 生成的缓存表，固定首个 query/state/key 快照。
    const entries = syncKeepAliveCacheEntries({
      entries: [],
      activeConfig: {
        cacheKey: '/examples/list',
        routeName: '/examples/list',
        shouldCache: true,
      },
      locationSnapshot: {
        pathname: '/examples/list',
        search: '?page=1',
        hash: '',
        state: { page: 1 },
        key: 'examples-1',
      },
      cachedViews: ['/examples/list', '/dashboard'],
    });

    expect(entries).toEqual([
      {
        cacheKey: '/examples/list',
        routeName: '/examples/list',
        locationSnapshot: {
          pathname: '/examples/list',
          search: '?page=1',
          hash: '',
          state: { page: 1 },
          key: 'examples-1',
        },
      },
    ]);

    // `updatedEntries`：同路径再次导航后的表，预期仍保留首个位置快照而非 later key。
    const updatedEntries = syncKeepAliveCacheEntries({
      entries,
      activeConfig: {
        cacheKey: '/examples/list',
        routeName: '/examples/list',
        shouldCache: true,
      },
      locationSnapshot: {
        pathname: '/examples/list',
        search: '?page=3',
        hash: '',
        state: { page: 3 },
        key: 'examples-3',
      },
      cachedViews: ['/examples/list'],
    });

    expect(updatedEntries).toEqual([
      {
        cacheKey: '/examples/list',
        routeName: '/examples/list',
        locationSnapshot: {
          pathname: '/examples/list',
          search: '?page=1',
          hash: '',
          state: { page: 1 },
          key: 'examples-1',
        },
      },
    ]);

    expect(
      syncKeepAliveCacheEntries({
        entries: updatedEntries,
        activeConfig: {
          cacheKey: '/system/dict/data/12',
          routeName: '/system/dict/data/12',
          shouldCache: false,
        },
        locationSnapshot: {
          pathname: '/system/dict/data/12',
          search: '',
          hash: '',
          state: null,
          key: 'dict-12',
        },
        cachedViews: ['/dashboard'],
      })
    ).toEqual([]);
  });

  /**
   * 条目等价同时比较身份与位置快照，query/key 改变必须判为不同。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('should compare cache entries by route identity and location snapshot', () => {
    // `previousEntries`：等价比较的基准表，后续改变 query/key 应识别为不同快照。
    const previousEntries = [
      {
        cacheKey: '/dashboard',
        routeName: 'Dashboard',
        locationSnapshot: {
          pathname: '/dashboard',
          search: '',
          hash: '',
          state: null,
          key: 'dashboard-1',
        },
      },
    ];

    expect(
      areKeepAliveEntriesEqual({
        previousEntries,
        nextEntries: [
          {
            cacheKey: '/dashboard',
            routeName: 'Dashboard',
            locationSnapshot: {
              pathname: '/dashboard',
              search: '',
              hash: '',
              state: null,
              key: 'dashboard-1',
            },
          },
        ],
      })
    ).toBe(true);

    expect(
      areKeepAliveEntriesEqual({
        previousEntries,
        nextEntries: [
          {
            cacheKey: '/dashboard',
            routeName: 'Dashboard',
            locationSnapshot: {
              pathname: '/dashboard',
              search: '?tab=1',
              hash: '',
              state: null,
              key: 'dashboard-2',
            },
          },
        ],
      })
    ).toBe(false);
  });
});

// ───── 模块结束：src/components/RouteKeepAliveOutlet/__tests__/utils.test.js ─────
