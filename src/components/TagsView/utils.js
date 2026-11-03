/**
 * @file src/components/TagsView/utils.js
 * @description TagsView 共享 helper，统一处理标签路径规整、路由递归查找、affix 标签提取与关闭回退语义。
 * @example
 * const matchedRoute = findTagsViewRoute(routeTree, '/system/dict/data/8');
 * const nextTag = buildTagsViewTag({ pathname: '/system/dict/data/8', search: '?dictType=user', currentRoute: matchedRoute });
 */
import { ensureArray, ensureString, safeDecodeURIComponent } from '@/utils/robust';
export const TAGS_VIEW_HOME_PATH = '/dashboard';
export const TAGS_VIEW_ROOT_PATH = '/';
export const TAGS_VIEW_REDIRECT_PREFIX = '/redirect';
export const TAGS_VIEW_DICT_DATA_PAGE_PREFIX = '/system/dict/data/';
export const TAGS_VIEW_DEFAULT_TAG_TITLE = '未命名';
export const TAGS_VIEW_DEFAULT_PAGE_TITLE = '页面';
export const TAGS_VIEW_EMPTY_VIEWS = Object.freeze([]);
/**
 * 把根路径统一映射为首页标签路径，并移除末尾斜杠。
 * @param {*} path 待规整路径。
 * @returns {string} 规整后的标签路径。
 */
export function normalizeTagsViewHomePath(path) {
  const safePath = ensureString(path);
  if (!safePath || safePath === TAGS_VIEW_ROOT_PATH) {
    return TAGS_VIEW_HOME_PATH;
  }

  const cleanPath = safePath.replace(/\/+$/, '') || TAGS_VIEW_ROOT_PATH;
  return cleanPath === TAGS_VIEW_ROOT_PATH ? TAGS_VIEW_HOME_PATH : cleanPath;
}

/**
 * 标准化普通路径，移除末尾斜杠并保留根路径 `/`。
 * @param {*} path 待规整路径。
 * @returns {string} 规整后的路径。
 */
export function normalizeTagsViewPath(path) {
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
  const normalizedRoutePath = normalizeTagsViewPath(routePath);
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

  const routeSegments = normalizedRoutePath.split('/');
  const targetSegments = normalizedTargetPath.split('/');
  if (routeSegments.length !== targetSegments.length) {
    return false;
  }

  return routeSegments.every((segment, index) => {
    return segment.startsWith(':') || segment === targetSegments[index];
  });
}

/**
 * 解析当前路由节点的完整路径，兼容绝对路径、相对路径和无 path 的容器节点。
 * @param {Record<string, any>} route 当前路由节点。
 * @param {string} parentPath 父级完整路径。
 * @returns {string} 当前节点对应的完整路径。
 */
function resolveTagsViewRouteFullPath(route, parentPath = '') {
  const routePath = ensureString(route?.path);
  if (!routePath) {
    return normalizeTagsViewPath(parentPath) || TAGS_VIEW_ROOT_PATH;
  }

  if (routePath.startsWith('/')) {
    return normalizeTagsViewPath(routePath);
  }

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
  const stableRouteList = ensureArray(routeList, TAGS_VIEW_EMPTY_VIEWS);
  const normalizedTargetPath = normalizeTagsViewPath(targetPath);
  if (!normalizedTargetPath) {
    return null;
  }

  for (const route of stableRouteList) {
    const fullPath = resolveTagsViewRouteFullPath(route, parentPath);
    if (tagsViewPathMatches(fullPath, normalizedTargetPath)) {
      return {
        ...route,
        fullPath,
      };
    }

    const childRoutes = Array.isArray(route?.children)
      ? route.children
      : Array.isArray(route?.routes)
        ? route.routes
        : TAGS_VIEW_EMPTY_VIEWS;
    if (childRoutes.length === 0) {
      continue;
    }

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
  const stableRouteList = ensureArray(routeList, TAGS_VIEW_EMPTY_VIEWS);
  if (stableRouteList.length === 0) {
    return TAGS_VIEW_EMPTY_VIEWS;
  }

  let affixTags = [];

  stableRouteList.forEach((route) => {
    const fullPath = resolveTagsViewRouteFullPath(route, basePath);

    if (route?.meta?.affix) {
      affixTags.push({
        path: normalizeTagsViewHomePath(fullPath),
        name: route.name,
        title: route?.meta?.title || route?.name || TAGS_VIEW_DEFAULT_TAG_TITLE,
        meta: { ...route.meta },
      });
    }

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
export function buildTagsViewFallbackTag({ pathname, fullPath }) {
  const normalizedPathname = normalizeTagsViewHomePath(pathname);
  const pathSegments = normalizedPathname.split('/').filter(Boolean);
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
 * 根据当前路由配置生成标签标题，兼容字典数据详情页的动态标题特例。
 * @param {{ pathname?: string, search?: string, currentRoute?: Record<string, any> | null }} options 标题构建参数。
 * @returns {string} 标签标题。
 */
export function buildTagsViewDisplayTitle({ pathname, search, currentRoute }) {
  const normalizedPathname = normalizeTagsViewHomePath(pathname);
  let title =
    currentRoute?.meta?.title ||
    currentRoute?.title ||
    currentRoute?.name ||
    normalizedPathname.split('/').filter(Boolean).slice(-1)[0] ||
    TAGS_VIEW_DEFAULT_TAG_TITLE;

  if (normalizedPathname.startsWith(TAGS_VIEW_DICT_DATA_PAGE_PREFIX)) {
    const searchParams = new URLSearchParams(ensureString(search).replace(/^\?/, ''));
    const dictType = searchParams.get('dictType');
    if (dictType) {
      title = `字典数据【${safeDecodeURIComponent(dictType, dictType)}】`;
    }
  }

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
export function buildTagsViewTag({ pathname, search, hash, currentRoute }) {
  const normalizedPathname = normalizeTagsViewHomePath(pathname);
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
  const stableVisitedViews = ensureArray(visitedViews, TAGS_VIEW_EMPTY_VIEWS);
  const stableRouteTree = ensureArray(routeTree, TAGS_VIEW_EMPTY_VIEWS);
  if (stableVisitedViews.length === 0 || stableRouteTree.length === 0) {
    return {
      hasChanges: false,
      updatedViews: stableVisitedViews,
    };
  }

  let hasChanges = false;
  const updatedViews = stableVisitedViews.map((view) => {
    const currentRoute = findTagsViewRoute(stableRouteTree, view?.path);
    if (!currentRoute) {
      return view;
    }

    const nextTitle = currentRoute.meta?.title || currentRoute.title || currentRoute.name || view.title;
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
  });

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
 * 说明：老项目固定标签不会渲染关闭按钮，这里统一收口该判断，避免组件层散落条件分支。
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
  const stableVisitedViews = ensureArray(visitedViews, TAGS_VIEW_EMPTY_VIEWS);
  const latestView = stableVisitedViews[stableVisitedViews.length - 1];
  if (latestView?.path) {
    return {
      method: 'push',
      path: latestView.fullPath || latestView.path,
    };
  }

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
