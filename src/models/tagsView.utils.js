/**
 * @file src/models/tagsView.utils.js
 * @description tagsView model 共享 helper，统一处理标签路径规整、持久化读写与 affix 固定标签删除保护。
 * @example
 * const state = loadTagsViewStateFromStorage(window.localStorage);
 * const nextVisitedViews = buildVisitedViewsAfterDelete({ visitedViews: state.visitedViews, view });
 */
import logger from '@/utils/logger';
import { ensureArray, ensureString, safeJsonParse } from '@/utils/robust';
export const TAGS_VIEW_STORAGE_KEY = 'framework_tags_view';
export const TAGS_VIEW_HOME_PATH = '/dashboard';
/**
 * 创建一份新的空标签状态，避免多个调用方共享同一数组引用。
 * @returns {{ visitedViews: Array<Record<string, any>>, cachedViews: string[] }} 空状态。
 */
export function createEmptyTagsViewState() {
  return {
    visitedViews: [],
    cachedViews: [],
  };
}

/**
 * 标准化 tagsView store 中保存的路径，把根路径折叠到首页并移除末尾斜杠。
 * @param {*} path 待规整路径。
 * @returns {string} 规整后的路径。
 */
export function normalizeTagsViewStoredPath(path) {
  const safePath = ensureString(path);
  if (!safePath || safePath === '/') {
    return TAGS_VIEW_HOME_PATH;
  }

  const cleanPath = safePath.replace(/\/+$/, '') || '/';
  return cleanPath === '/' ? TAGS_VIEW_HOME_PATH : cleanPath;
}

/**
 * 判断标签是否为 affix 固定标签。
 * @param {*} view 标签对象。
 * @returns {boolean} 是否为 affix 标签。
 */
export function isTagsViewAffix(view) {
  return Boolean(view?.meta?.affix);
}

/**
 * 判断标签是否允许走删除链路。
 * 说明：固定标签在 UI 层不可关闭，store 层也需要做同样保护，避免未来误 dispatch 时把 affix 标签删掉。
 * @param {*} view 标签对象。
 * @returns {boolean} 是否允许删除。
 */
export function canDeleteTagsView(view) {
  return !isTagsViewAffix(view);
}

/**
 * 从 localStorage 读取 tagsView 状态，并把缓存结构规整为稳定数组。
 * @param {Storage | undefined | null} [storage=globalThis?.localStorage] storage 实例。
 * @returns {{ visitedViews: Array<Record<string, any>>, cachedViews: string[] }} 读取后的状态。
 */
export function loadTagsViewStateFromStorage(storage = globalThis?.localStorage) {
  const emptyState = createEmptyTagsViewState();
  if (!storage || typeof storage.getItem !== 'function') {
    return emptyState;
  }

  try {
    const stored = storage.getItem(TAGS_VIEW_STORAGE_KEY);
    if (!stored) {
      return emptyState;
    }

    const data = safeJsonParse(stored);
    return {
      visitedViews: ensureArray(data?.visitedViews, []),
      cachedViews: ensureArray(data?.cachedViews, []),
    };
  } catch (error) {
    logger.error('加载标签页失败:', error);
    return emptyState;
  }
}

/**
 * 把当前 tagsView 状态写回 localStorage。
 * @param {{ visitedViews?: Array<Record<string, any>>, cachedViews?: string[] }} state 当前状态。
 * @param {Storage | undefined | null} [storage=globalThis?.localStorage] storage 实例。
 * @returns {void}
 */
export function saveTagsViewStateToStorage(state, storage = globalThis?.localStorage) {
  if (!storage || typeof storage.setItem !== 'function') {
    return;
  }

  try {
    storage.setItem(
      TAGS_VIEW_STORAGE_KEY,
      JSON.stringify({
        visitedViews: ensureArray(state?.visitedViews, []),
        cachedViews: ensureArray(state?.cachedViews, []),
      })
    );
  } catch (error) {
    logger.error('保存标签页失败:', error);
  }
}

/**
 * 清理 localStorage 中的 tagsView 状态。
 * @param {Storage | undefined | null} [storage=globalThis?.localStorage] storage 实例。
 * @returns {void}
 */
export function clearTagsViewStateFromStorage(storage = globalThis?.localStorage) {
  if (!storage || typeof storage.removeItem !== 'function') {
    return;
  }

  try {
    storage.removeItem(TAGS_VIEW_STORAGE_KEY);
  } catch (error) {
    logger.error('清空标签页失败:', error);
  }
}

/**
 * 计算删除标签后的已访问标签列表，并在 store 层保护 affix 固定标签不被误删。
 * @param {{ visitedViews?: Array<Record<string, any>>, view?: Record<string, any> }} options 删除参数。
 * @returns {Array<Record<string, any>>} 删除后的标签列表。
 */
export function buildVisitedViewsAfterDelete({ visitedViews, view }) {
  const stableVisitedViews = ensureArray(visitedViews, []);
  const safeViewPath = ensureString(view?.path);
  if (!canDeleteTagsView(view) || !safeViewPath) {
    return stableVisitedViews;
  }

  const targetPath = normalizeTagsViewStoredPath(safeViewPath);
  return stableVisitedViews.filter((currentView) => {
    return normalizeTagsViewStoredPath(currentView?.path) !== targetPath;
  });
}
