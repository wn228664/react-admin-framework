/**
 * @file src/utils/pageTitle.js
 * @description 页面标题 helper，统一处理应用主标题拼装、路由标题匹配与当前页面标题解析。
 * @example
 * const pageTitle = resolveMatchedPageTitle(clientRoutes, '/system/user');
 * document.title = getPageTitle(pageTitle);
 */
import { matchRoutes } from 'react-router-dom';
import { ensureArray, ensureString } from '@/utils/robust';
export const DEFAULT_APP_TITLE = 'React Admin Framework';
export const PAGE_TITLE_SEPARATOR = ' - ';
/**
 * 从单个路由节点中提取可展示的页面标题。
 * @param {Record<string, any> | null | undefined} route 路由节点。
 * @returns {string} 优先返回 `title`，其次 `meta.title`，最后回退到 `name`。
 */
export function resolveRoutePageTitle(route) {
  const safeRoute = route && typeof route === 'object' ? route : null;
  return ensureString(safeRoute?.title || safeRoute?.meta?.title || safeRoute?.name, '');
}

/**
 * 根据当前路径从路由树中解析匹配到的叶子页面标题。
 * @param {Array<Record<string, any>>} clientRoutes Umi 运行时透传的客户端路由树。
 * @param {string | { pathname?: string } | null | undefined} location 当前路由位置对象或 pathname。
 * @returns {string} 当前路径对应的页面标题；未命中时返回空字符串。
 */
export function resolveMatchedPageTitle(clientRoutes, location) {
  const pathname = ensureString(typeof location === 'string' ? location : location?.pathname, '');
  if (!pathname) {
    return '';
  }
  const safeRoutes = ensureArray(clientRoutes);
  if (safeRoutes.length === 0) {
    return '';
  }
  const matchedRoutes = matchRoutes(safeRoutes, pathname) || [];
  if (matchedRoutes.length === 0) {
    return '';
  }
  const matchedTitle = matchedRoutes
    .slice()
    .reverse()
    .map((matchedRoute) => resolveRoutePageTitle(matchedRoute?.route))
    .find(Boolean);

  return ensureString(matchedTitle, '');
}

/**
 * 按“页面标题 - 应用标题”的口径生成最终文档标题。
 * @param {string | null | undefined} pageTitle 当前页面标题。
 * @param {string | null | undefined} [appTitle=DEFAULT_APP_TITLE] 应用主标题。
 * @returns {string} 可直接写入 `document.title` 的完整标题。
 */
export function getPageTitle(pageTitle, appTitle = DEFAULT_APP_TITLE) {
  const safeAppTitle = ensureString(appTitle, DEFAULT_APP_TITLE).trim() || DEFAULT_APP_TITLE;
  const safePageTitle = ensureString(pageTitle, '').trim();
  return safePageTitle ? `${safePageTitle}${PAGE_TITLE_SEPARATOR}${safeAppTitle}` : safeAppTitle;
}
