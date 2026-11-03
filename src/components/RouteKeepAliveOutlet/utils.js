/**
 * @file src/components/RouteKeepAliveOutlet/utils.js
 * @description RouteKeepAliveOutlet 的共享 helper，统一处理当前路由缓存判定、布局子路由提取、location 快照和缓存条目同步。
 * @example
 * const activeConfig = resolveRouteKeepAliveConfig({ selectedRoutes, pathname, cachedViews });
 * const cacheEntries = syncKeepAliveCacheEntries({ entries: [], activeConfig, locationSnapshot, cachedViews });
 */
import { ensureArray, ensureString } from '@/utils/robust';
export const ROUTE_KEEP_ALIVE_EMPTY_ENTRIES = [];
/**
 * 标准化内容区缓存使用的 pathname，保持根路径和尾部斜杠语义稳定。
 * @param {*} pathname 当前路由 pathname。
 * @returns {string} 标准化后的 pathname。
 */
export function normalizeRouteKeepAlivePath(pathname) {
  const safePathname = ensureString(pathname);
  if (!safePathname) {
    return '';
  }

  return safePathname === '/' ? '/' : safePathname.replace(/\/+$/, '');
}

/**
 * 构建一份稳定的 location 快照，让缓存页在切走后仍然绑定自己的路由上下文。
 * @param {{ pathname?: string, search?: string, hash?: string, state?: any, key?: string } | undefined | null} location 当前 location。
 * @returns {{ pathname: string, search: string, hash: string, state: any, key: string }} 只保留缓存渲染需要的 location 字段。
 */
export function buildKeepAliveLocationSnapshot(location) {
  const normalizedPathname = normalizeRouteKeepAlivePath(location?.pathname);

  return {
    pathname: normalizedPathname,
    search: ensureString(location?.search),
    hash: ensureString(location?.hash),
    state: location?.state,
    key: ensureString(location?.key),
  };
}

/**
 * 解析当前路由是否应该进入内容区缓存，并产出与 Vue `router-view :key="$route.path"` 对齐的缓存配置。
 * 统一使用 pathname 作为 routeName，确保与 TagsView 中写入 cachedViews 的口径完全一致，
 * 避免 useSelectedRoutes 与 menu.routes 返回的 route.name 不一致导致缓存失效。
 * @param {{
 *   selectedRoutes?: Array<{ route?: Record<string, any> }>,
 *   pathname?: string,
 * }} options 当前路由参数。
 * @returns {{ cacheKey: string, routeName: string, shouldCache: boolean }} 当前页面的缓存配置。
 */
export function resolveRouteKeepAliveConfig({ selectedRoutes, pathname }) {
  const normalizedPathname = normalizeRouteKeepAlivePath(pathname);
  const stableSelectedRoutes = ensureArray(selectedRoutes, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES);
  const currentRoute = stableSelectedRoutes[stableSelectedRoutes.length - 1]?.route || null;
  const routeMeta = currentRoute?.meta || {};
  const routeName = normalizedPathname;

  return {
    cacheKey: normalizedPathname,
    routeName,
    shouldCache: Boolean(routeName) && !routeMeta?.noCache,
  };
}

/**
 * 从 Umi clientRoutes 中提取 BasicLayout 下的业务子路由，避免缓存渲染再次进入 Layout 造成递归。
 * @param {Array<Record<string, any>> | undefined | null} clientRoutes Umi clientRoutes。
 * @returns {Array<Record<string, any>>} BasicLayout 下的子路由列表。
 */
export function resolveLayoutOutletRoutes(clientRoutes) {
  const stableClientRoutes = ensureArray(clientRoutes, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES);
  const layoutRootRoute = stableClientRoutes.find((route) => {
    const childRoutes = Array.isArray(route?.children)
      ? route.children
      : Array.isArray(route?.routes)
        ? route.routes
        : ROUTE_KEEP_ALIVE_EMPTY_ENTRIES;

    return route?.path === '/' && childRoutes.length > 0;
  });

  if (!layoutRootRoute) {
    return ROUTE_KEEP_ALIVE_EMPTY_ENTRIES;
  }

  return Array.isArray(layoutRootRoute.children)
    ? layoutRootRoute.children
    : Array.isArray(layoutRootRoute.routes)
      ? layoutRootRoute.routes
      : ROUTE_KEEP_ALIVE_EMPTY_ENTRIES;
}
/**
 * 同步内容区缓存条目：保留仍在 cachedViews 中的历史页面，并按当前激活页更新/插入对应快照。
 * @param {{
 *   entries?: Array<{ cacheKey?: string, routeName?: string, locationSnapshot?: Record<string, any> }>,
 *   activeConfig?: { cacheKey?: string, routeName?: string, shouldCache?: boolean },
 *   locationSnapshot?: { pathname?: string, search?: string, hash?: string, state?: any, key?: string } | undefined | null,
 *   cachedViews?: string[]
 * }} options 缓存同步参数。
 * @returns {Array<{ cacheKey: string, routeName: string, locationSnapshot: Record<string, any> }>} 同步后的缓存条目。
 */
export function syncKeepAliveCacheEntries({ entries, activeConfig, locationSnapshot, cachedViews }) {
  const stableEntries = ensureArray(entries, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES);
  const cachedViewSet = new Set(
    ensureArray(cachedViews, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES)
      .map((viewName) => ensureString(viewName))
      .filter(Boolean)
  );
  const entryMap = new Map();

  stableEntries.forEach((entry) => {
    const normalizedCacheKey = normalizeRouteKeepAlivePath(entry?.cacheKey);
    const stableRouteName = ensureString(entry?.routeName);
    /* 删除条件：只有当 cachedViews 已初始化（非空）且明确不包含该 routeName 时才删除。
       这样可以避免首次渲染时 cachedViews 尚未更新导致的误删。 */
    const shouldDelete = cachedViewSet.size > 0 && !cachedViewSet.has(stableRouteName);
    if (!normalizedCacheKey || !stableRouteName || shouldDelete) {
      return;
    }

    entryMap.set(normalizedCacheKey, {
      cacheKey: normalizedCacheKey,
      routeName: stableRouteName,
      locationSnapshot: buildKeepAliveLocationSnapshot(entry?.locationSnapshot),
    });
  });

  if (!activeConfig?.shouldCache) {
    return Array.from(entryMap.values());
  }
  const activeCacheKey = normalizeRouteKeepAlivePath(activeConfig?.cacheKey);
  const activeRouteName = ensureString(activeConfig?.routeName);
  /* 不再检查 cachedViewSet.has(activeRouteName)，因为 shouldCache 已独立判断，
     cachedViews 可能尚在异步更新中，不应阻塞新条目的创建。 */
  if (!activeCacheKey || !activeRouteName) {
    return Array.from(entryMap.values());
  }

  /* 仅当该 cacheKey 尚未存在于缓存时才新建条目并写入 locationSnapshot；
     已有条目保留原 locationSnapshot，避免因 location.key 变化导致 useRoutes 重挂载组件。 */
  if (!entryMap.has(activeCacheKey)) {
    entryMap.set(activeCacheKey, {
      cacheKey: activeCacheKey,
      routeName: activeRouteName,
      locationSnapshot: buildKeepAliveLocationSnapshot(locationSnapshot),
    });
  }

  return Array.from(entryMap.values());
}

/**
 * 判断两组缓存条目是否完全一致，避免组件层在无变化时重复 setState。
 * @param {{
 *   previousEntries?: Array<{ cacheKey?: string, routeName?: string, locationSnapshot?: Record<string, any> }>,
 *   nextEntries?: Array<{ cacheKey?: string, routeName?: string, locationSnapshot?: Record<string, any> }>
 * }} options 对比参数。
 * @returns {boolean} 两组缓存条目是否相同。
 */
export function areKeepAliveEntriesEqual({ previousEntries, nextEntries }) {
  const stablePreviousEntries = ensureArray(previousEntries, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES);
  const stableNextEntries = ensureArray(nextEntries, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES);
  if (stablePreviousEntries.length !== stableNextEntries.length) {
    return false;
  }

  return stablePreviousEntries.every((previousEntry, index) => {
    const nextEntry = stableNextEntries[index];
    return (
      normalizeRouteKeepAlivePath(previousEntry?.cacheKey) === normalizeRouteKeepAlivePath(nextEntry?.cacheKey) &&
      ensureString(previousEntry?.routeName) === ensureString(nextEntry?.routeName) &&
      normalizeRouteKeepAlivePath(previousEntry?.locationSnapshot?.pathname) ===
        normalizeRouteKeepAlivePath(nextEntry?.locationSnapshot?.pathname) &&
      ensureString(previousEntry?.locationSnapshot?.search) === ensureString(nextEntry?.locationSnapshot?.search) &&
      ensureString(previousEntry?.locationSnapshot?.hash) === ensureString(nextEntry?.locationSnapshot?.hash) &&
      ensureString(previousEntry?.locationSnapshot?.key) === ensureString(nextEntry?.locationSnapshot?.key) &&
      previousEntry?.locationSnapshot?.state === nextEntry?.locationSnapshot?.state
    );
  });
}
