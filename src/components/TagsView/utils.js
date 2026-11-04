/**
 * 模块职责：维护标签路径身份、固定项、路由标题与关闭后的最后可用导航目标。
 * 标签以规整 pathname 识别，fullPath 另保留 search/hash 供恢复；标题来自路由配置，不绑定特定业务路径。
 * 纯函数不修改菜单或访问历史，固定项保护与 model 层约束共同保证恢复入口存在。
 */
// 只对标签和路由输入做类型收窄，空路径按框架首页规则恢复。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 * `ensureString`：把可确定的标量转成展示文本，避免对象意外渲染为 [object Object]。
 */
import { ensureArray, ensureString } from '@/utils/robust';
// `TAGS_VIEW_HOME_PATH`：固定框架首页 /dashboard，空路径和根路径映射到同一标签身份。
export const TAGS_VIEW_HOME_PATH = '/dashboard';
// `TAGS_VIEW_ROOT_PATH`：路由根 /；普通路径规整保留它，标签身份规整再将它映射首页。
export const TAGS_VIEW_ROOT_PATH = '/';
// `TAGS_VIEW_REDIRECT_PREFIX`：历史刷新恢复入口前缀 /redirect，和页面缓存身份分开，不从业务参数推导。
export const TAGS_VIEW_REDIRECT_PREFIX = '/redirect';
// `TAGS_VIEW_DEFAULT_TAG_TITLE`：缺少元数据、名称和有效路径段时的标签兜底文本“未命名”。
export const TAGS_VIEW_DEFAULT_TAG_TITLE = '未命名';
// `TAGS_VIEW_DEFAULT_PAGE_TITLE`：路由未命中且路径无有效尾段时的普通页面标题“页面”。
export const TAGS_VIEW_DEFAULT_PAGE_TITLE = '页面';
// `TAGS_VIEW_EMPTY_VIEWS`：共享冻结空数组，仅作只读兜底，有效派生列表另行创建。
export const TAGS_VIEW_EMPTY_VIEWS = Object.freeze([]);
/**
 * 把根路径统一映射为首页标签路径，并移除末尾斜杠。
 * @param {*} path 待规整路径。
 * @returns {string} 规整后的标签路径。
 */
export function normalizeTagsViewHomePath(path) {
  // `safePath`：标签身份输入的字符串值，空或 / 直接使用框架首页。
  const safePath = ensureString(path);
  if (!safePath || safePath === TAGS_VIEW_ROOT_PATH) {
    return TAGS_VIEW_HOME_PATH;
  }

  // `cleanPath`：剔除尾斜杠的标签路径；若结果为根则统一回到首页身份。
  const cleanPath = safePath.replace(/\/+$/, '') || TAGS_VIEW_ROOT_PATH;
  return cleanPath === TAGS_VIEW_ROOT_PATH ? TAGS_VIEW_HOME_PATH : cleanPath;
}

/**
 * 标准化普通路径，移除末尾斜杠并保留根路径 `/`。
 * @param {*} path 待规整路径。
 * @returns {string} 规整后的路径。
 */
export function normalizeTagsViewPath(path) {
  // `safePath`：普通路由匹配输入的字符串值，空值保持未命中，不强制变首页。
  const safePath = ensureString(path);
  if (!safePath) {
    return '';
  }

  return safePath === TAGS_VIEW_ROOT_PATH ? TAGS_VIEW_ROOT_PATH : safePath.replace(/\/+$/, '');
}

/**
 * 判断目标路径是否命中当前路由路径，兼容动态参数段。
 * @param {*} routePath 路由定义中的 path。
 * @param {*} targetPath 当前 pathname。
 * @returns {boolean} 是否命中。
 */
export function tagsViewPathMatches(routePath, targetPath) {
  // `normalizedRoutePath`：声明路由的标准匹配路径，动态段按冒号识别。
  const normalizedRoutePath = normalizeTagsViewPath(routePath);
  // `normalizedTargetPath`：当前路径的标准值，静态优先相等，动态路径要求段数一致。
  const normalizedTargetPath = normalizeTagsViewPath(targetPath);
  if (!normalizedRoutePath || !normalizedTargetPath) {
    return false;
  }

  if (normalizedRoutePath === normalizedTargetPath) {
    return true;
  }

  if (!normalizedRoutePath.includes(':')) {
    return false;
  }

  // `routeSegments`：声明路径按 / 分段的数组，不在匹配中改写路径或执行表达式。
  const routeSegments = normalizedRoutePath.split('/');
  // `targetSegments`：当前 pathname 分段数组，与声明各段一一比较。
  const targetSegments = normalizedTargetPath.split('/');
  if (routeSegments.length !== targetSegments.length) {
    return false;
  }

  return routeSegments.every(
    (
      /* `segment`：声明路径当前段，冒号开头为动态占位，其余按同位置文本严格比较。 */ segment,
      /* `index`：路径段的零起始下标，两侧段数相等后使用。 */ index
    ) => {
      return segment.startsWith(':') || segment === targetSegments[index];
    }
  );
}

/**
 * 解析当前路由节点的完整路径，兼容绝对路径、相对路径和无 path 的容器节点。
 * @param {Record<string, any>} route 当前路由节点。
 * @param {string} parentPath 父级完整路径。
 * @returns {string} 当前节点对应的完整路径。
 */
function resolveTagsViewRouteFullPath(route, parentPath = '') {
  // `routePath`：当前节点自己的 path 文本，缺失时沿父路径，绝对路径不重复拼父级。
  const routePath = ensureString(route?.path);
  if (!routePath) {
    return normalizeTagsViewPath(parentPath) || TAGS_VIEW_ROOT_PATH;
  }

  if (routePath.startsWith('/')) {
    return normalizeTagsViewPath(routePath);
  }

  // `normalizedParentPath`：相对节点的标准完整父路径，不能丢失祖先层级。
  const normalizedParentPath = normalizeTagsViewPath(parentPath);
  if (!normalizedParentPath || normalizedParentPath === TAGS_VIEW_ROOT_PATH) {
    return normalizeTagsViewPath(`/${routePath}`);
  }

  return normalizeTagsViewPath(`${normalizedParentPath}/${routePath}`.replace(/\/+/g, '/'));
}

/**
 * 递归查找指定路径对应的路由配置，兼容 `children/routes` 两种字段。
 * @param {*} routeList 当前层级路由数组。
 * @param {*} targetPath 目标路径。
 * @param {string} parentPath 父级完整路径。
 * @returns {Record<string, any> | null} 命中的路由配置。
 */
export function findTagsViewRoute(routeList, targetPath, parentPath = '') {
  // `stableRouteList`：查找阶段当前层安全数组，空输入直接返回未命中。
  const stableRouteList = ensureArray(routeList, TAGS_VIEW_EMPTY_VIEWS);
  // `normalizedTargetPath`：递归查找的固定标准目标，所有层级使用相同路径口径。
  const normalizedTargetPath = normalizeTagsViewPath(targetPath);
  if (!normalizedTargetPath) {
    return null;
  }

  // `route`：查找阶段当前节点，只读 path/children/routes，命中时返回附完整路径的副本。
  for (const route of stableRouteList) {
    // `fullPath`：当前查找节点的完整路径，用于动态/静态匹配和子树基准。
    const fullPath = resolveTagsViewRouteFullPath(route, parentPath);
    if (tagsViewPathMatches(fullPath, normalizedTargetPath)) {
      return {
        ...route,
        fullPath,
      };
    }

    // `childRoutes`：查找阶段当前子树，children 优先、routes 兜底，否则共享空表。
    const childRoutes = Array.isArray(route?.children)
      ? route.children
      : Array.isArray(route?.routes)
        ? route.routes
        : TAGS_VIEW_EMPTY_VIEWS;
    if (childRoutes.length === 0) {
      continue;
    }

    // `matchedRoute`：当前子树的第一个命中节点，存在则终止本层其它分支搜索。
    const matchedRoute = findTagsViewRoute(childRoutes, normalizedTargetPath, fullPath);
    if (matchedRoute) {
      return matchedRoute;
    }
  }

  return null;
}
/**
 * 递归提取路由树中的 affix 标签。
 * @param {*} routeList 当前层级路由数组。
 * @param {string} basePath 父级完整路径。
 * @returns {Array<{ path: string, name?: string, title: string, meta: Record<string, any> }>} affix 标签列表。
 */
export function collectTagsViewAffixTags(routeList, basePath = TAGS_VIEW_ROOT_PATH) {
  // `stableRouteList`：提取固定标签阶段的安全路由数组，不改变原配置。
  const stableRouteList = ensureArray(routeList, TAGS_VIEW_EMPTY_VIEWS);
  if (stableRouteList.length === 0) {
    return TAGS_VIEW_EMPTY_VIEWS;
  }

  // `affixTags`：本次新建的固定标签累加列表，递归结果 concat 保留声明顺序。
  let affixTags = [];

  stableRouteList.forEach((/* `route`：固定标签提取时当前声明节点，只有 meta.affix 为真才加入本层结果。 */ route) => {
    // `fullPath`：当前固定项候选的完整路由路径，作为标签和下层递归基准。
    const fullPath = resolveTagsViewRouteFullPath(route, basePath);

    if (route?.meta?.affix) {
      affixTags.push({
        path: normalizeTagsViewHomePath(fullPath),
        name: route.name,
        title: route?.meta?.title || route?.name || TAGS_VIEW_DEFAULT_TAG_TITLE,
        meta: { ...route.meta },
      });
    }

    // `childRoutes`：提取固定项时的当前子树，所有层级都检查 meta.affix。
    const childRoutes = Array.isArray(route?.children)
      ? route.children
      : Array.isArray(route?.routes)
        ? route.routes
        : TAGS_VIEW_EMPTY_VIEWS;
    if (childRoutes.length > 0) {
      affixTags = affixTags.concat(collectTagsViewAffixTags(childRoutes, fullPath));
    }
  });

  return affixTags;
}

/**
 * 构建找不到路由配置时的兜底标签。
 * @param {{ pathname?: string, fullPath?: string }} options 标签构建参数。
 * @returns {{ path: string, fullPath: string, name: string, title: string, meta: Record<string, any> }} 兜底标签。
 */
export function buildTagsViewFallbackTag({
  /* `pathname`：当前 pathname 文本，统一根路径身份后使用，不携带查询/hash。 */ pathname,
  fullPath,
}) {
  // `normalizedPathname`：兜底标签的统一路径身份，根路径折叠首页。
  const normalizedPathname = normalizeTagsViewHomePath(pathname);
  // `pathSegments`：兜底路径的非空层级，用末段生成纯展示标题，不解析业务含义。
  const pathSegments = normalizedPathname.split('/').filter(Boolean);
  // `fallbackTitle`：路径末段或“页面”的显示文本，不能作为路由身份。
  const fallbackTitle = pathSegments[pathSegments.length - 1] || TAGS_VIEW_DEFAULT_PAGE_TITLE;

  return {
    path: normalizedPathname,
    fullPath: ensureString(fullPath) || normalizedPathname,
    name: normalizedPathname,
    title: fallbackTitle,
    meta: {},
  };
}

/**
 * 从当前路由元数据选择标签文案，不解释任何特定查询字段。
 * @param {Object} options pathname 为当前路径，currentRoute 为已匹配路由。
 * @returns {string} 按 meta.title/title/name/路径末段/未命名依次取值，不访问网络。
 */
export function buildTagsViewDisplayTitle({
  /* `pathname`：当前 pathname 文本，统一根路径身份后使用，不携带查询/hash。 */ pathname,
  /* `currentRoute`：当前已匹配的路由声明，可为空；其标题/meta 用于生成标签投影。 */ currentRoute,
}) {
  // `normalizedPathname`：选择标题时的标准路径，元数据不足时用末段作为显示兜底。
  const normalizedPathname = normalizeTagsViewHomePath(pathname);
  // `title`：按 meta.title、title、name、路径尾段、未命名依次选出的标签文本。
  const title =
    currentRoute?.meta?.title ||
    currentRoute?.title ||
    currentRoute?.name ||
    normalizedPathname.split('/').filter(Boolean).slice(-1)[0] ||
    TAGS_VIEW_DEFAULT_TAG_TITLE;

  return title;
}

/**
 * 根据 pathname/search/hash 和命中的路由配置生成下一次要写入 tagsView 的标签数据。
 * @param {{
 *   pathname?: string,
 *   search?: string,
 *   hash?: string,
 *   currentRoute?: Record<string, any> | null
 * }} options 标签构建参数。
 * @returns {{ path: string, fullPath: string, name: string, title: string, meta: Record<string, any> }} 下一个标签对象。
 */
export function buildTagsViewTag({
  /* `pathname`：当前 pathname 文本，统一根路径身份后使用，不携带查询/hash。 */ pathname,
  /* `search`：当前 location.search，保留前导问号，仅用于 fullPath 恢复，不参与标签/缓存去重。 */ search,
  /* `hash`：当前 location.hash，保留前导 #，仅用于 fullPath 恢复。 */ hash,
  /* `currentRoute`：当前已匹配的路由声明，可为空；其标题/meta 用于生成标签投影。 */ currentRoute,
}) {
  // `normalizedPathname`：当前导航的统一标签与缓存身份，search/hash 不创建另一份标签。
  const normalizedPathname = normalizeTagsViewHomePath(pathname);
  // `fullPath`：标准 pathname 拼接原 search/hash 的恢复地址；不得包含需要持久化保护的秘密。
  const fullPath = `${normalizedPathname}${ensureString(search)}${ensureString(hash)}`;

  if (!currentRoute) {
    return buildTagsViewFallbackTag({
      pathname: normalizedPathname,
      fullPath,
    });
  }

  return {
    path: normalizedPathname,
    fullPath,
    /* 统一使用 pathname 作为 name，确保与 RouteKeepAliveOutlet 中的 routeName 完全一致，
       避免因 useSelectedRoutes 与 menu.routes 返回的 route.name 不一致导致缓存失效。 */
    name: normalizedPathname,
    title: buildTagsViewDisplayTitle({
      pathname: normalizedPathname,
      search,
      currentRoute,
    }),
    meta: currentRoute.meta || {},
  };
}

/**
 * 根据最新菜单树回填已访问标签的标题与 meta。
 * @param {{ visitedViews?: Array<Record<string, any>>, routeTree?: Array<Record<string, any>> }} options 回填参数。
 * @returns {{ hasChanges: boolean, updatedViews: Array<Record<string, any>> }} 是否发生变化以及新的标签列表。
 */
export function buildUpdatedVisitedTags({ visitedViews, routeTree }) {
  // `stableVisitedViews`：标题回填前的安全访问列表，空菜单或空访问时直接保留。
  const stableVisitedViews = ensureArray(visitedViews, TAGS_VIEW_EMPTY_VIEWS);
  // `stableRouteTree`：当前有效菜单安全数组，标题/affix/noCache 以它的声明为准。
  const stableRouteTree = ensureArray(routeTree, TAGS_VIEW_EMPTY_VIEWS);
  if (stableVisitedViews.length === 0 || stableRouteTree.length === 0) {
    return {
      hasChanges: false,
      updatedViews: stableVisitedViews,
    };
  }

  // `hasChanges`：是否有任一访问项的标题、固定标记或缓存标记变化，初始 false。
  let hasChanges = false;
  // `updatedViews`：按新菜单投影的访问数组；未命中和语义未变化项保留原对象引用。
  const updatedViews = stableVisitedViews.map(
    (/* `view`：需要按最新菜单回填的当前访问标签，不因缺少命中而删除它。 */ view) => {
      // `currentRoute`：当前已访问路径在最新菜单中的命中节点，未找到不覆盖旧标题。
      const currentRoute = findTagsViewRoute(stableRouteTree, view?.path);
      if (!currentRoute) {
        return view;
      }

      // `nextTitle`：最新路由提供的标题候选，仍按 meta.title/title/name 选择，最后沿用旧标题。
      const nextTitle = currentRoute.meta?.title || currentRoute.title || currentRoute.name || view.title;
      // `nextMeta`：最新路由元数据，缺失时保留旧 meta；当前比较只关心 affix/noCache。
      const nextMeta = currentRoute.meta || view.meta;
      if (
        nextTitle !== view.title ||
        Boolean(nextMeta?.affix) !== Boolean(view.meta?.affix) ||
        Boolean(nextMeta?.noCache) !== Boolean(view.meta?.noCache)
      ) {
        hasChanges = true;
        return {
          ...view,
          title: nextTitle,
          meta: nextMeta,
        };
      }

      return view;
    }
  );

  return {
    hasChanges,
    updatedViews,
  };
}

/**
 * 判断标签是否为 affix 标签。
 * @param {*} tag 标签对象。
 * @returns {boolean} 是否为 affix 标签。
 */
export function isTagsViewAffix(tag) {
  return Boolean(tag?.meta?.affix);
}

/**
 * 判断标签是否允许显示关闭入口。
 * 固定标签作为恢复入口不显示普通关闭按钮；模型层仍须执行同样保护。
 * @param {*} tag 标签对象。
 * @returns {boolean} 是否允许关闭。
 */
export function canCloseTagsView(tag) {
  return !isTagsViewAffix(tag);
}

/**
 * 判断标签是否与当前 pathname 处于同一页面。
 * @param {{ currentPath?: string, tagPath?: string }} options 对比参数。
 * @returns {boolean} 是否激活。
 */
export function isTagsViewActive({ currentPath, tagPath }) {
  return normalizeTagsViewHomePath(currentPath) === normalizeTagsViewHomePath(tagPath);
}

/**
 * 解析关闭标签后的回退导航动作。
 * @param {{ visitedViews?: Array<Record<string, any>>, view?: Record<string, any> }} options 关闭动作参数。
 * @returns {{ method: 'push' | 'replace', path: string }} 导航动作描述。
 */
export function resolveTagsViewLastNavigation({ visitedViews, view }) {
  // `stableVisitedViews`：关闭标签后的安全访问列表，最后一项优先作为回退入口。
  const stableVisitedViews = ensureArray(visitedViews, TAGS_VIEW_EMPTY_VIEWS);
  // `latestView`：最新仍保留的访问项，优先 fullPath 恢复查询/hash，否则只用 path。
  const latestView = stableVisitedViews[stableVisitedViews.length - 1];
  if (latestView?.path) {
    return {
      method: 'push',
      path: latestView.fullPath || latestView.path,
    };
  }

  // `normalizedViewPath`：刚关闭目标的标准路径，列表为空时判断是否需要首页刷新恢复分支。
  const normalizedViewPath = normalizeTagsViewHomePath(view?.path);
  if (view?.name === 'Dashboard' || normalizedViewPath === TAGS_VIEW_HOME_PATH) {
    return {
      method: 'replace',
      path: `${TAGS_VIEW_REDIRECT_PREFIX}${view?.fullPath || normalizedViewPath}`,
    };
  }

  return {
    method: 'push',
    path: TAGS_VIEW_ROOT_PATH,
  };
}

// ───── 模块结束：src/components/TagsView/utils.js ─────
