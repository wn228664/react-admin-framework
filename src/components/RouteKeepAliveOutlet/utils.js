/**
 * 模块职责：维护页面缓存的路径身份、location 快照与条目同步，不执行 React 渲染或 history 导航。
 * pathname 是稳定身份，search/hash/state 在条目创建时固定为该实例的路由快照；meta.noCache 明确禁止缓存。
 * 只保留 cachedViews 允许的条目；删除条目由渲染层完成实例释放，工具函数不启动后台任务。
 */
// 只从路由/缓存输入中收窄数组和字符串，不把异常结构直接交给路由匹配。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 * `ensureString`：把可确定的标量转成展示文本，避免对象意外渲染为 [object Object]。
 */
import { ensureArray, ensureString } from '@/utils/robust';
// `ROUTE_KEEP_ALIVE_EMPTY_ENTRIES`：共享的只读空数组兜底；所有派生过程创建新容器，不能向它 push。
export const ROUTE_KEEP_ALIVE_EMPTY_ENTRIES = [];
/**
 * 标准化内容区缓存使用的 pathname，保持根路径和尾部斜杠语义稳定。
 * @param {*} pathname 当前路由 pathname。
 * @returns {string} 标准化后的 pathname。
 */
export function normalizeRouteKeepAlivePath(pathname) {
  // `safePathname`：缓存路径输入收窄的文本，空值不生成缓存身份；根路径保留 /。
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
  // `normalizedPathname`：位置快照使用的标准 pathname；search/hash/state/key 在同一快照中保留。
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
 * 解析当前页的路径缓存身份与元数据许可，使标签目录和内容实例使用同一规则。
 * 统一使用 pathname 作为 routeName，确保与 TagsView 中写入 cachedViews 的口径完全一致，
 * 避免 useSelectedRoutes 与 menu.routes 返回的 route.name 不一致导致缓存失效。
 * @param {{
 *   selectedRoutes?: Array<{ route?: Record<string, any> }>,
 *   pathname?: string,
 * }} options 当前路由参数。
 * @returns {{ cacheKey: string, routeName: string, shouldCache: boolean }} 当前页面的缓存配置。
 */
export function resolveRouteKeepAliveConfig({ selectedRoutes, pathname }) {
  // `normalizedPathname`：当前页面用于 cacheKey/routeName 的标准路径，不以路由显示名称作为身份。
  const normalizedPathname = normalizeRouteKeepAlivePath(pathname);
  // `stableSelectedRoutes`：Umi 当前匹配链的安全数组，末项代表实际页面声明。
  const stableSelectedRoutes = ensureArray(selectedRoutes, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES);
  // `currentRoute`：匹配链末项的 route，缺失时 null；meta.noCache 用于显式禁用缓存。
  const currentRoute = stableSelectedRoutes[stableSelectedRoutes.length - 1]?.route || null;
  // `routeMeta`：当前页面的元数据对象，缺失时空对象，不根据业务名称猜缓存策略。
  const routeMeta = currentRoute?.meta || {};
  // `routeName`：与标准 pathname 相同的缓存目录名称，必须和 TagsView.cachedViews 使用同一口径。
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
  // `stableClientRoutes`：Umi clientRoutes 的安全数组，仅从框架根布局中提取内容区路由。
  const stableClientRoutes = ensureArray(clientRoutes, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES);
  // `layoutRootRoute`：首个 path=/ 且拥有子路由的布局根；不存在时不递归重建 Layout。
  const layoutRootRoute = stableClientRoutes.find(
    (/* `route`：clientRoutes 当前根候选；必须 path=/ 并具有子树才作为布局内容来源。 */ route) => {
      // `childRoutes`：当前根候选的 children 或 routes 安全数组，用于判断是否是有内容出口的根。
      const childRoutes = Array.isArray(route?.children)
        ? route.children
        : Array.isArray(route?.routes)
          ? route.routes
          : ROUTE_KEEP_ALIVE_EMPTY_ENTRIES;

      return route?.path === '/' && childRoutes.length > 0;
    }
  );

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
 * 同步内容区缓存条目：保留仍在 cachedViews 中的历史页面，并仅在激活页未有条目时插入初始快照。
 * @param {{
 *   entries?: Array<{ cacheKey?: string, routeName?: string, locationSnapshot?: Record<string, any> }>,
 *   activeConfig?: { cacheKey?: string, routeName?: string, shouldCache?: boolean },
 *   locationSnapshot?: { pathname?: string, search?: string, hash?: string, state?: any, key?: string } | undefined | null,
 *   cachedViews?: string[]
 * }} options 缓存同步参数。
 * @returns {Array<{ cacheKey: string, routeName: string, locationSnapshot: Record<string, any> }>} 同步后的缓存条目。
 */
export function syncKeepAliveCacheEntries({ entries, activeConfig, locationSnapshot, cachedViews }) {
  // `stableEntries`：前次缓存条目数组，非数组使用共享空值；同步过程不修改原项。
  const stableEntries = ensureArray(entries, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES);
  // `cachedViewSet`：当前缓存许可目录的去重集合；空目录撤销所有非活动实例，初次发布前仅允许当前可缓存页占位。
  const cachedViewSet = new Set(
    ensureArray(cachedViews, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES)
      .map((/* `viewName`：缓存许可目录中的当前名称，收窄为字符串后过滤空值，不做路径跳转。 */ viewName) =>
        ensureString(viewName)
      )
      .filter(Boolean)
  );
  // `entryMap`：本次新建的 cacheKey 到条目映射，去重后保持插入顺序，最终转换成新数组。
  const entryMap = new Map();

  stableEntries.forEach((/* `entry`：前次缓存的当前条目；规整身份并根据非空许可目录决定是否保留。 */ entry) => {
    // `normalizedCacheKey`：历史条目的标准路径身份，空值条目被剔除。
    const normalizedCacheKey = normalizeRouteKeepAlivePath(entry?.cacheKey);
    // `stableRouteName`：历史条目用于许可目录比较的名称；空值条目不进入新缓存。
    const stableRouteName = ensureString(entry?.routeName);
    // `isCurrentCacheable`：历史条目恰好是当前允许缓存的页面；目录尚未发布时仍保留其首次快照，不保留其它旧页。
    const isCurrentCacheable =
      activeConfig?.shouldCache && normalizedCacheKey === normalizeRouteKeepAlivePath(activeConfig?.cacheKey);
    // `shouldDelete`：条目既不在当前缓存目录、也不是当前可缓存页时删除；中转 noCache 配合空目录能真正卸载旧实例。
    const shouldDelete = !cachedViewSet.has(stableRouteName) && !isCurrentCacheable;
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
  // `activeCacheKey`：当前页面的标准路径身份，空值时不插入新条目。
  const activeCacheKey = normalizeRouteKeepAlivePath(activeConfig?.cacheKey);
  // `activeRouteName`：当前页面的缓存目录名称；只在 shouldCache=true 且名称非空时创建。
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
  // `stablePreviousEntries`：等价比较的前次安全数组；按相同位置比较身份和首次位置快照。
  const stablePreviousEntries = ensureArray(previousEntries, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES);
  // `stableNextEntries`：等价比较的下一次安全数组，长度变化立即判定不等。
  const stableNextEntries = ensureArray(nextEntries, ROUTE_KEEP_ALIVE_EMPTY_ENTRIES);
  if (stablePreviousEntries.length !== stableNextEntries.length) {
    return false;
  }

  return stablePreviousEntries.every(
    (
      /* `previousEntry`：前次安全数组中的当前条目，字段只用于浅比较，不修改 state 引用。 */ previousEntry,
      /* `index`：当前条目零起始位置；两组长度相同后读取下一组对应项。 */ index
    ) => {
      // `nextEntry`：与当前前次项同位置的下一项；比较 cacheKey/routeName 与快照五字段。
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
    }
  );
}

// ───── 模块结束：src/components/RouteKeepAliveOutlet/utils.js ─────
