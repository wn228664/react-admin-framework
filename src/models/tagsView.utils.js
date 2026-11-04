/**
 * 模块职责：持久化和恢复非敏感标签快照，并在模型层保护固定标签不被普通关闭动作删除。
 * 访问 localStorage 的属性读取也在异常边界内，受限浏览器存储不能阻止框架启动。
 * 读失败返回新的空快照，写/删失败报告日志但不撤销内存导航；它不是可靠业务数据存储。
 */
// 只记录存储能力失败；标签中不得保存凭证或敏感查询参数。
/**
 * `logger`：提供统一诊断入口；warn/error 在生产仍可能输出，调用前必须移除秘密和原始响应。
 */
import logger from '@/utils/logger';
// 安全解析与列表收窄限制恢复形状，调用方仍按当前路由树重新验证页面入口。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 * `ensureString`：把可确定的标量转成展示文本，避免对象意外渲染为 [object Object]。
 * `safeJsonParse`：读取非敏感持久化快照或 JSON 文本，解析异常交回调用方给定默认值。
 */
import { ensureArray, ensureString, safeJsonParse } from '@/utils/robust';
// 非敏感标签偏好的中性命名空间，不复用任何会话 Cookie 或业务缓存键。
// `TAGS_VIEW_STORAGE_KEY`：标签偏好独立的 localStorage 命名空间 framework_tags_view，只保存非敏感访问/缓存目录，不与会话键混用。
export const TAGS_VIEW_STORAGE_KEY = 'framework_tags_view';
// `TAGS_VIEW_HOME_PATH`：标签状态的框架首页路径 /dashboard，空路径和 / 统一映射到它。
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
  // `safePath`：外部恢复/动作提供的路径文本，空值回到首页，不自动生成业务查询。
  const safePath = ensureString(path);
  if (!safePath || safePath === '/') {
    return TAGS_VIEW_HOME_PATH;
  }

  // `cleanPath`：剔除尾斜杠的路径文本，最终 / 再映射首页以保持身份一致。
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
export function loadTagsViewStateFromStorage(storage) {
  // `emptyState`：本次读取独有的空状态，存储不可用或失败时返回，不共享可变数组。
  const emptyState = createEmptyTagsViewState();
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    if (!storage || typeof storage.getItem !== 'function') return emptyState;
    // `stored`：localStorage 指定命名空间读取的原始 JSON 文本，不作为可信菜单直接导航。
    const stored = storage.getItem(TAGS_VIEW_STORAGE_KEY);
    if (!stored) {
      return emptyState;
    }

    // `data`：安全解析后的非敏感标签快照；仅收窄 visitedViews/cachedViews 数组形状。
    const data = safeJsonParse(stored);
    return {
      visitedViews: ensureArray(data?.visitedViews, []),
      cachedViews: ensureArray(data?.cachedViews, []),
    };
  } catch (/* `error`：存储属性访问/读取/解析过程的异常；返回新空状态，不能阻止页面启动。 */ error) {
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
export function saveTagsViewStateToStorage(state, storage) {
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    if (!storage || typeof storage.setItem !== 'function') return;
    storage.setItem(
      TAGS_VIEW_STORAGE_KEY,
      JSON.stringify({
        visitedViews: ensureArray(state?.visitedViews, []),
        cachedViews: ensureArray(state?.cachedViews, []),
      })
    );
  } catch (/* `error`：存储属性访问、序列化或写入失败；记录诊断但保留已经发布的内存标签。 */ error) {
    logger.error('保存标签页失败:', error);
  }
}

/**
 * 清理 localStorage 中的 tagsView 状态。
 * @param {Storage | undefined | null} [storage=globalThis?.localStorage] storage 实例。
 * @returns {void}
 */
export function clearTagsViewStateFromStorage(storage) {
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    if (!storage || typeof storage.removeItem !== 'function') return;
    storage.removeItem(TAGS_VIEW_STORAGE_KEY);
  } catch (/* `error`：存储属性访问或删除失败；不撤销内存清理，调用方不能当作可靠数据删除凭证。 */ error) {
    logger.error('清空标签页失败:', error);
  }
}

/**
 * 计算删除标签后的已访问标签列表，并在 store 层保护 affix 固定标签不被误删。
 * @param {{ visitedViews?: Array<Record<string, any>>, view?: Record<string, any> }} options 删除参数。
 * @returns {Array<Record<string, any>>} 删除后的标签列表。
 */
export function buildVisitedViewsAfterDelete({ visitedViews, view }) {
  // `stableVisitedViews`：删除前的安全已访问数组；固定标签或无目标时直接保留其引用。
  const stableVisitedViews = ensureArray(visitedViews, []);
  // `safeViewPath`：删除动作的明确目标路径文本；缺失时不误删首页。
  const safeViewPath = ensureString(view?.path);
  if (!canDeleteTagsView(view) || !safeViewPath) {
    return stableVisitedViews;
  }

  // `targetPath`：目标路径的统一首页/尾斜杠身份，供过滤比较，不发导航或远端删除。
  const targetPath = normalizeTagsViewStoredPath(safeViewPath);
  return stableVisitedViews.filter(
    (/* `currentView`：已访问列表当前项，统一路径后与目标比较，未匹配项保持原引用。 */ currentView) => {
      return normalizeTagsViewStoredPath(currentView?.path) !== targetPath;
    }
  );
}

// ───── 模块结束：src/models/tagsView.utils.js ─────
