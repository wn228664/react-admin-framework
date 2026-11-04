/**
 * 模块职责：从运行时匹配路由解析页面标题，并与应用名组合用于 document.title。
 * 路由入口和标签页可共用同一标题来源；缺少页面文本时返回框架标题，不触发导航或网络请求。
 */
// React Router 的匹配器按实际嵌套路由解析标题，避免字符串前缀误命中。
/**
 * `matchRoutes`：按实际路由树计算当前匹配链，标题不从业务查询字段推测。
 */
import { matchRoutes } from 'react-router-dom';
// 类型收窄只处理路由配置中的候选标题，避免空值造成文档标题异常。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 * `ensureString`：把可确定的标量转成展示文本，避免对象意外渲染为 [object Object]。
 */
import { ensureArray, ensureString } from '@/utils/robust';
// `DEFAULT_APP_TITLE`：页面标题或应用名称缺失时显示的框架名；业务项目应在统一入口修改。
export const DEFAULT_APP_TITLE = 'React Admin Framework';
// `PAGE_TITLE_SEPARATOR`：只连接非空页面标题与应用名的展示分隔符，不参与路径、缓存或导航身份。
export const PAGE_TITLE_SEPARATOR = ' - ';
/**
 * 从单个路由节点中提取可展示的页面标题。
 * @param {Record<string, any> | null | undefined} route 路由节点。
 * @returns {string} 优先返回 `title`，其次 `meta.title`，最后回退到 `name`。
 */
export function resolveRoutePageTitle(route) {
  // `safeRoute`：已收窄为对象的路由候选；非对象置 null，后续可选读取不会访问未知标量。
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
  // `pathname`：本次位置快照的 pathname 文本；不消费 query/hash 生成页面标题，空路径直接不匹配。
  const pathname = ensureString(typeof location === 'string' ? location : location?.pathname, '');
  if (!pathname) {
    return '';
  }
  // `safeRoutes`：用于 matchRoutes 的数组候选；无有效路由树时不尝试匹配。
  const safeRoutes = ensureArray(clientRoutes);
  if (safeRoutes.length === 0) {
    return '';
  }
  // `matchedRoutes`：Router 返回的父到子匹配链；未命中统一为空数组，不读取上次导航结果。
  const matchedRoutes = matchRoutes(safeRoutes, pathname) || [];
  if (matchedRoutes.length === 0) {
    return '';
  }
  // `matchedTitle`：反向扫描匹配链取得的首个非空标题，即优先当前叶子，其次有标题的祖先。
  const matchedTitle = matchedRoutes
    .slice()
    .reverse()
    .map(
      (
        /* `matchedRoute`：反向遍历的一个路由匹配记录；只读取其 route 的展示标题，不执行导航或变更匹配链。 */ matchedRoute
      ) => resolveRoutePageTitle(matchedRoute?.route)
    )
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
  // `safeAppTitle`：trim 后的应用名称，空值始终退回 DEFAULT_APP_TITLE，避免文档标题变为空白。
  const safeAppTitle = ensureString(appTitle, DEFAULT_APP_TITLE).trim() || DEFAULT_APP_TITLE;
  // `safePageTitle`：当前页的纯展示标题，trim 后为空则不额外输出分隔符。
  const safePageTitle = ensureString(pageTitle, '').trim();
  return safePageTitle ? `${safePageTitle}${PAGE_TITLE_SEPARATOR}${safeAppTitle}` : safeAppTitle;
}

// ───── 模块结束：src/utils/pageTitle.js ─────
