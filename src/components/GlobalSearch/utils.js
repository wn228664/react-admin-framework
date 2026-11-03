/**
 * @file src/components/GlobalSearch/utils.js
 * @description GlobalSearch 共享 helper，统一处理路由源回退、菜单扁平化、关键字过滤与快捷键判定。
 * @example
 * const routesToSearch = resolveGlobalSearchRoutes(dynamicRoutes, routeConfig);
 * const results = filterGlobalSearchResults(flattenGlobalSearchRoutes(routesToSearch), '组件');
 */
import Fuse from 'fuse.js';
import PinyinMatch from 'pinyin-match';
import { ensureArray, ensureString } from '@/utils/robust';
export const GLOBAL_SEARCH_RESULT_LIMIT = 10;
export const GLOBAL_SEARCH_FUSE_OPTIONS = Object.freeze({
  includeScore: true,
  shouldSort: true,
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 1,
  keys: [
    { name: 'title', weight: 0.7 },
    { name: 'fullTitle', weight: 0.2 },
    { name: 'path', weight: 0.1 },
  ],
});
export const GLOBAL_SEARCH_MATCH_PRIORITY = Object.freeze({
  titleExact: 0,
  fullTitleExact: 1,
  titleLowerCase: 2,
  fullTitleLowerCase: 3,
  pathLowerCase: 4,
  titlePinyin: 5,
  fullTitlePinyin: 6,
  fuzzyBase: 10,
});
export const GLOBAL_SEARCH_EMPTY_RESULTS = Object.freeze([]);
export const GLOBAL_SEARCH_ROOT_ROUTE_PATH = '/';
/**
 * 从动态路由与静态路由配置中解析 GlobalSearch 应该使用的路由树。
 * @param {*} routes BasicLayout 透传的动态菜单路由。
 * @param {*} staticRouteConfig 静态路由配置数组。
 * @returns {Array<Record<string, any>>} GlobalSearch 使用的路由树。
 */
export function resolveGlobalSearchRoutes(routes, staticRouteConfig) {
  const dynamicRoutes = ensureArray(routes, GLOBAL_SEARCH_EMPTY_RESULTS);
  if (dynamicRoutes.length > 0) {
    return dynamicRoutes;
  }
  const staticRoutes = ensureArray(staticRouteConfig, GLOBAL_SEARCH_EMPTY_RESULTS);
  const mainRoute = staticRoutes.find((route) => {
    return route?.path === GLOBAL_SEARCH_ROOT_ROUTE_PATH && Array.isArray(route?.routes);
  });
  return ensureArray(mainRoute?.routes, GLOBAL_SEARCH_EMPTY_RESULTS);
}

/**
 * 扁平化路由树，提取所有带 `meta.title` 与 `path` 的可搜索菜单项。
 * @param {*} routes 待扁平化的路由树。
 * @param {string} [parentPath=''] 父级路径，用于拼装相对子路由地址。
 * @param {string} [parentTitle=''] 父级标题链，用于拼装完整菜单路径文案。
 * @returns {Array<{ title: string, fullTitle: string, path: string, icon: any, component: any }>} 可搜索菜单项列表。
 */
export function flattenGlobalSearchRoutes(routes, parentPath = '', parentTitle = '') {
  const routeList = ensureArray(routes, GLOBAL_SEARCH_EMPTY_RESULTS);
  if (routeList.length === 0) {
    return GLOBAL_SEARCH_EMPTY_RESULTS;
  }
  let flattenedRoutes = [];
  routeList.forEach((route) => {
    const routeTitle = String(route?.meta?.title ?? '');
    const routePath = ensureString(route?.path);
    if (routeTitle && routePath && !route?.redirect) {
      const fullPath = routePath.startsWith('/') ? routePath : `${parentPath}/${routePath}`;
      const fullTitle = parentTitle ? `${parentTitle} / ${routeTitle}` : routeTitle;

      flattenedRoutes.push({
        title: routeTitle,
        fullTitle,
        path: fullPath,
        icon: route?.meta?.icon,
        component: route?.component,
      });
    }
    const childRoutes = Array.isArray(route?.routes)
      ? route.routes
      : Array.isArray(route?.children)
        ? route.children
        : GLOBAL_SEARCH_EMPTY_RESULTS;
    if (childRoutes.length === 0) {
      return;
    }
    const childPath = routePath || parentPath;
    const childTitle = routeTitle ? (parentTitle ? `${parentTitle} / ${routeTitle}` : routeTitle) : parentTitle;
    flattenedRoutes = flattenedRoutes.concat(flattenGlobalSearchRoutes(childRoutes, childPath, childTitle));
  });

  return flattenedRoutes;
}
/**
 * 为搜索结果构建稳定 identity，避免多轮匹配合并时重复插入同一菜单项。
 * @param {{ path?: string, title?: string, fullTitle?: string }} item 当前菜单项。
 * @returns {string} 由 path、title、fullTitle 组合的稳定唯一键。
 */
export function getGlobalSearchResultIdentity(item) {
  const safePath = String(item?.path ?? '');
  const safeTitle = String(item?.title ?? '');
  const safeFullTitle = String(item?.fullTitle ?? '');
  return `${safePath}::${safeTitle}::${safeFullTitle}`;
}

/**
 * 统一规整菜单项上参与搜索的文本字段，避免每轮匹配重复做空值处理。
 * @param {{ title?: string, fullTitle?: string, path?: string }} item 当前菜单项。
 * @returns {{ title: string, fullTitle: string, path: string }} 规整后的搜索字段。
 */
export function normalizeGlobalSearchSearchFields(item) {
  const title = String(item?.title ?? '');
  const fullTitle = String(item?.fullTitle ?? '');
  const path = ensureString(item?.path);
  return { title, fullTitle, path };
}

/**
 * 判断单个菜单项是否命中精确或拼音搜索，并返回排序优先级。
 * @param {{ title: string, fullTitle: string, path: string }} searchFields 当前菜单项搜索字段。
 * @param {string} keyword 用户输入的原始关键字。
 * @param {string} keywordLower 用户输入的小写关键字。
 * @returns {number | null} 命中的优先级；未命中则返回 null。
 */
export function resolveGlobalSearchDirectMatchPriority(searchFields, keyword, keywordLower) {
  const title = searchFields.title;
  const fullTitle = searchFields.fullTitle;
  const path = searchFields.path;

  if (title.includes(keyword)) {
    return GLOBAL_SEARCH_MATCH_PRIORITY.titleExact;
  }

  if (fullTitle.includes(keyword)) {
    return GLOBAL_SEARCH_MATCH_PRIORITY.fullTitleExact;
  }

  if (title.toLowerCase().includes(keywordLower)) {
    return GLOBAL_SEARCH_MATCH_PRIORITY.titleLowerCase;
  }

  if (fullTitle.toLowerCase().includes(keywordLower)) {
    return GLOBAL_SEARCH_MATCH_PRIORITY.fullTitleLowerCase;
  }

  if (path.toLowerCase().includes(keywordLower)) {
    return GLOBAL_SEARCH_MATCH_PRIORITY.pathLowerCase;
  }

  if (title && PinyinMatch.match(title, keywordLower)) {
    return GLOBAL_SEARCH_MATCH_PRIORITY.titlePinyin;
  }

  if (fullTitle && PinyinMatch.match(fullTitle, keywordLower)) {
    return GLOBAL_SEARCH_MATCH_PRIORITY.fullTitlePinyin;
  }

  return null;
}

/**
 * 用 Fuse 为剩余菜单项补充 fuzzy 匹配结果，覆盖拼写不完整或中间缺字的场景。
 * @param {Array<Record<string, any>>} routeItems 可搜索菜单项列表。
 * @param {string} keyword 用户输入关键字。
 * @returns {Array<{ item: Record<string, any>, refIndex?: number, score?: number }>} Fuse 返回的模糊匹配结果。
 */
export function searchGlobalSearchFuzzyResults(routeItems, keyword) {
  const stableRouteItems = ensureArray(routeItems, GLOBAL_SEARCH_EMPTY_RESULTS);
  if (stableRouteItems.length === 0) {
    return GLOBAL_SEARCH_EMPTY_RESULTS;
  }
  const fuse = new Fuse(stableRouteItems, GLOBAL_SEARCH_FUSE_OPTIONS);
  return fuse.search(keyword);
}

/**
 * 按关键字过滤可搜索菜单项，并保持现有最多展示 10 条结果的口径。
 * @param {*} routeItems 可搜索菜单项列表。
 * @param {*} searchValue 搜索关键字。
 * @returns {Array<{ title: string, fullTitle: string, path: string, icon: any, component: any }>} 过滤后的结果列表。
 */
export function filterGlobalSearchResults(routeItems, searchValue) {
  const stableRouteItems = ensureArray(routeItems, GLOBAL_SEARCH_EMPTY_RESULTS);
  const keyword = String(searchValue ?? '').trim();
  if (!keyword) {
    return GLOBAL_SEARCH_EMPTY_RESULTS;
  }
  const keywordLower = keyword.toLowerCase();
  const matchedRouteItemMap = new Map();

  stableRouteItems.forEach((item, index) => {
    const searchFields = normalizeGlobalSearchSearchFields(item);
    const priority = resolveGlobalSearchDirectMatchPriority(searchFields, keyword, keywordLower);
    if (priority === null) {
      return;
    }
    const identity = getGlobalSearchResultIdentity(item);
    matchedRouteItemMap.set(identity, {
      item,
      index,
      priority,
    });
  });
  const fuzzyMatches = searchGlobalSearchFuzzyResults(stableRouteItems, keyword);
  fuzzyMatches.forEach((result) => {
    const identity = getGlobalSearchResultIdentity(result?.item);
    if (matchedRouteItemMap.has(identity)) {
      return;
    }
    const fuzzyScore = Number.isFinite(result?.score) ? result.score : 1;
    matchedRouteItemMap.set(identity, {
      item: result?.item,
      index: Number.isFinite(result?.refIndex) ? result.refIndex : stableRouteItems.length,
      priority: GLOBAL_SEARCH_MATCH_PRIORITY.fuzzyBase + fuzzyScore,
    });
  });
  const sortedMatchedRouteItems = Array.from(matchedRouteItemMap.values()).sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.index - right.index;
  });
  return sortedMatchedRouteItems.slice(0, GLOBAL_SEARCH_RESULT_LIMIT).map((matchedRouteItem) => {
    return matchedRouteItem.item;
  });
}

/**
 * 判断按键事件是否命中 GlobalSearch 的全局快捷键。
 * @param {*} event 键盘事件对象。
 * @returns {boolean} 是否命中 `Ctrl/Cmd + K`。
 */
export function isGlobalSearchShortcut(event) {
  const safeEvent = event && typeof event === 'object' ? event : null;
  if (!safeEvent) {
    return false;
  }

  return Boolean(safeEvent.ctrlKey || safeEvent.metaKey) && safeEvent.key === 'k';
}
