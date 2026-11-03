/**
 * @file src/components/Breadcrumb/utils.js
 * @description Breadcrumb 共享 helper，统一处理路径规整、动态参数匹配、路由递归查找与面包屑数据构建。
 * @example
 * const entries = buildBreadcrumbEntries({ pathname, search, routes, staticRoutes });
 * const matchedRoutes = findMatchedBreadcrumbRoutes(routes, pathname);
 */
import { ensureArray, ensureString, safeDecodeURIComponent } from '@/utils/robust';
export const BREADCRUMB_HOME_PATH = '/dashboard';
export const BREADCRUMB_HOME_TITLE = '首页';
export const BREADCRUMB_ROOT_PATH = '/';
export const BREADCRUMB_DICT_DATA_PATH_PREFIX = '/system/dict/data/';
export const BREADCRUMB_DICT_DATA_TITLE = '字典数据';
/**
 * 标准化路径，移除末尾斜杠并保持根路径为 `/`。
 * @param {*} path 待规整路径。
 * @returns {string} 规整后的路径。
 */
export function normalizeBreadcrumbPath(path) {
  const safePath = ensureString(path);
  if (!safePath) {
    return '';
  }
  return safePath === BREADCRUMB_ROOT_PATH ? BREADCRUMB_ROOT_PATH : safePath.replace(/\/+$/, '');
}

/**
 * 判断目标路径是否命中当前路由路径，兼容动态参数段。
 * @param {*} routePath 路由定义中的 path。
 * @param {*} targetPath 当前 pathname。
 * @returns {boolean} 是否匹配。
 */
export function breadcrumbPathMatches(routePath, targetPath) {
  const normalizedRoutePath = normalizeBreadcrumbPath(routePath);
  const normalizedTargetPath = normalizeBreadcrumbPath(targetPath);
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
    if (segment.startsWith(':')) {
      return true;
    }
    return segment === targetSegments[index];
  });
}

/**
 * 递归查找当前路径命中的完整路由链，并为每个节点补 `fullPath`。
 * @param {*} routeList 待搜索的路由树。
 * @param {*} targetPath 当前 pathname。
 * @param {string} [parentPath=''] 父级路径。
 * @param {Array<Record<string, any>>} [parentRoutes=[]] 已命中的父级路由链。
 * @returns {Array<Record<string, any>>} 命中的完整路由链。
 */
export function findMatchedBreadcrumbRoutes(routeList, targetPath, parentPath = '', parentRoutes = []) {
  const normalizedTargetPath = normalizeBreadcrumbPath(targetPath);
  const stableRouteList = ensureArray(routeList);

  for (const route of stableRouteList) {
    const routePath = ensureString(route?.path);
    let fullPath = parentPath;
    if (routePath) {
      fullPath = routePath.startsWith(BREADCRUMB_ROOT_PATH)
        ? routePath
        : parentPath
          ? `${parentPath}/${routePath}`
          : `${BREADCRUMB_ROOT_PATH}${routePath}`;
    }
    fullPath = normalizeBreadcrumbPath(fullPath.replace(/\/+/g, '/'));

    const routeWithFullPath = { ...route, fullPath };
    if (breadcrumbPathMatches(fullPath, normalizedTargetPath)) {
      return [...parentRoutes, routeWithFullPath];
    }

    const childRoutes = Array.isArray(route?.children)
      ? route.children
      : Array.isArray(route?.routes)
        ? route.routes
        : [];
    if (childRoutes.length === 0) {
      continue;
    }

    const matchedChildRoutes = findMatchedBreadcrumbRoutes(childRoutes, normalizedTargetPath, fullPath, [
      ...parentRoutes,
      routeWithFullPath,
    ]);
    if (matchedChildRoutes.length > 0) {
      return matchedChildRoutes;
    }
  }

  return [];
}
/**
 * 判断当前面包屑数据是否已经包含首页。
 * @param {*} breadcrumbEntries 面包屑数据列表。
 * @returns {boolean} 是否已包含首页项。
 */
export function hasBreadcrumbHomeEntry(breadcrumbEntries) {
  const stableBreadcrumbEntries = ensureArray(breadcrumbEntries);
  return stableBreadcrumbEntries.some((entry) => {
    return entry?.title === BREADCRUMB_HOME_TITLE || entry?.path === BREADCRUMB_HOME_PATH || entry?.path === '/';
  });
}

/**
 * 根据 pathname、search 与路由树构建面包屑数据。
 * @param {{
 *   pathname?: string,
 *   search?: string,
 *   routes?: Array<Record<string, any>>,
 *   staticRoutes?: Array<Record<string, any>>
 * }} options 构建参数。
 * @returns {Array<{ title: string, path: string, isHome?: boolean }>} 面包屑数据列表。
 */
export function buildBreadcrumbEntries({ pathname, search, routes, staticRoutes }) {
  const normalizedPathname = normalizeBreadcrumbPath(pathname);
  if (normalizedPathname === BREADCRUMB_HOME_PATH || normalizedPathname === BREADCRUMB_ROOT_PATH) {
    return [];
  }

  let matchedRoutes = findMatchedBreadcrumbRoutes(routes, normalizedPathname);
  if (matchedRoutes.length === 0) {
    matchedRoutes = findMatchedBreadcrumbRoutes(staticRoutes, normalizedPathname);
  }

  const searchParams = new URLSearchParams(ensureString(search).replace(/^\?/, ''));
  const breadcrumbEntries = [];
  matchedRoutes.forEach((route) => {
    let title = route?.meta?.title || route?.title || route?.name;

    if (
      normalizedPathname.startsWith(BREADCRUMB_DICT_DATA_PATH_PREFIX) &&
      (route?.name === 'SystemDictData' || title === BREADCRUMB_DICT_DATA_TITLE)
    ) {
      const dictType = searchParams.get('dictType');
      if (dictType) {
        title = `${BREADCRUMB_DICT_DATA_TITLE}【${safeDecodeURIComponent(dictType, dictType)}】`;
      }
    }

    if (title && route?.meta?.breadcrumb !== false) {
      breadcrumbEntries.push({
        title,
        path: route.fullPath,
      });
    }
  });

  if (breadcrumbEntries.length > 0 && !hasBreadcrumbHomeEntry(breadcrumbEntries)) {
    breadcrumbEntries.unshift({
      title: BREADCRUMB_HOME_TITLE,
      path: BREADCRUMB_HOME_PATH,
      isHome: true,
    });
  }

  return breadcrumbEntries;
}
