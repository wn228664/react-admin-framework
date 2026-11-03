/**
 * @file src/components/RouteKeepAliveOutlet/__tests__/utils.test.js
 * @description RouteKeepAliveOutlet 共享 helper 测试，锁定当前页缓存判定、布局子路由提取、location 快照和缓存条目同步契约。
 */
import {
  areKeepAliveEntriesEqual,
  buildKeepAliveLocationSnapshot,
  resolveLayoutOutletRoutes,
  resolveRouteKeepAliveConfig,
  syncKeepAliveCacheEntries,
} from '../utils';

describe('RouteKeepAliveOutlet utils', () => {
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

  it('should extract BasicLayout child routes from the client route tree', () => {
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

  it('should add, update and prune cache entries according to cachedViews', () => {
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

  it('should compare cache entries by route identity and location snapshot', () => {
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
