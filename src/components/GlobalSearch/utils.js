/**
 * 模块职责：把可见路由树扁平化为菜单搜索条目，并组合直接文本、拼音和模糊匹配结果。
 * 路径和层级标题用于去重与展示，原路由树保持不变；不访问网络或为隐藏菜单授予权限。
 * 快捷键判定避开重复键、输入区域等不应抢占的交互，UI 只消费稳定结果列表。
 */
// Fuse 只在直接匹配不足时对已有菜单条目执行本地模糊搜索。
/**
 * `Fuse`：在已提供菜单条目中做本地模糊匹配，不搜索远端或隐藏目录。
 */
import Fuse from 'fuse.js';
// 拼音匹配补充中文菜单联想，不修改实际路由标题或生成新入口。
/**
 * `PinyinMatch`：补充中文菜单的拼音匹配，不更改实际标题或生成新路由。
 */
import PinyinMatch from 'pinyin-match';
// 类型收窄保证未就绪菜单不会让搜索过滤阶段抛错。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 * `ensureString`：把可确定的标量转成展示文本，避免对象意外渲染为 [object Object]。
 */
import { ensureArray, ensureString } from '@/utils/robust';
// `GLOBAL_SEARCH_RESULT_LIMIT`：最终最多展示 10 条菜单结果；限制在合并排序后执行，不提前截断某种匹配。
export const GLOBAL_SEARCH_RESULT_LIMIT = 10;
// `GLOBAL_SEARCH_FUSE_OPTIONS`：本地模糊搜索的冻结配置；标题权重最高，score 只用于直接匹配之后的补充排序。
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
// `GLOBAL_SEARCH_MATCH_PRIORITY`：直接标题/层级标题/路径/拼音与 fuzzy 的优先级；数字越小越靠前。
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
// `GLOBAL_SEARCH_EMPTY_RESULTS`：共享冻结空数组兜底，调用方不能原地追加；有效结果另建数组。
export const GLOBAL_SEARCH_EMPTY_RESULTS = Object.freeze([]);
// `GLOBAL_SEARCH_ROOT_ROUTE_PATH`：静态路由中主布局的固定路径 /，仅从它的 routes 提取框架入口。
export const GLOBAL_SEARCH_ROOT_ROUTE_PATH = '/';
/**
 * 从动态路由与静态路由配置中解析 GlobalSearch 应该使用的路由树。
 * @param {*} routes BasicLayout 透传的动态菜单路由。
 * @param {*} staticRouteConfig 静态路由配置数组。
 * @returns {Array<Record<string, any>>} GlobalSearch 使用的路由树。
 */
export function resolveGlobalSearchRoutes(routes, staticRouteConfig) {
  // `dynamicRoutes`：动态菜单的安全数组，非空就作为唯一来源，不与静态树混合重复入口。
  const dynamicRoutes = ensureArray(routes, GLOBAL_SEARCH_EMPTY_RESULTS);
  if (dynamicRoutes.length > 0) {
    return dynamicRoutes;
  }
  // `staticRoutes`：动态菜单为空时使用的静态配置安全数组，不查询后端菜单。
  const staticRoutes = ensureArray(staticRouteConfig, GLOBAL_SEARCH_EMPTY_RESULTS);
  // `mainRoute`：静态配置首个 path=/ 且具有 routes 数组的布局节点。
  const mainRoute = staticRoutes.find(
    (/* `route`：静态配置当前候选，只有根布局且 routes 为数组才作为静态目录入口。 */ route) => {
      return route?.path === GLOBAL_SEARCH_ROOT_ROUTE_PATH && Array.isArray(route?.routes);
    }
  );
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
  // `routeList`：当前递归层的安全路由数组，空层直接返回共享空结果。
  const routeList = ensureArray(routes, GLOBAL_SEARCH_EMPTY_RESULTS);
  if (routeList.length === 0) {
    return GLOBAL_SEARCH_EMPTY_RESULTS;
  }
  // `flattenedRoutes`：当前层新建的可搜索条目累加数组，后续子结果 concat 不修改原路由树。
  let flattenedRoutes = [];
  routeList.forEach((/* `route`：当前递归菜单节点；hidden 整树跳过，redirect 节点不生成自身入口。 */ route) => {
    if (route?.hidden) return;
    // `routeTitle`：当前节点 meta.title 的展示文本，缺失为空串；隐藏节点整棵子树不进入搜索。
    const routeTitle = String(route?.meta?.title ?? '');
    // `routePath`：当前节点的路径文本，空路径容器只向下传父路径，不生成自身入口。
    const routePath = ensureString(route?.path);
    // `fullPath`：绝对路径直接保留、相对段拼上完整父路径的导航地址；连续分隔符归一个 /。
    const fullPath = routePath.startsWith('/') ? routePath : `${parentPath}/${routePath}`.replace(/\/{2,}/g, '/');
    if (routeTitle && routePath && !route?.redirect) {
      // `fullTitle`：当前菜单完整标题链的文本形式，缺失为空串。
      const fullTitle = parentTitle ? `${parentTitle} / ${routeTitle}` : routeTitle;

      flattenedRoutes.push({
        title: routeTitle,
        fullTitle,
        path: fullPath,
        icon: route?.meta?.icon,
        component: route?.component,
      });
    }
    // `childRoutes`：当前节点子树，routes 优先、children 兜底，否则共享空表。
    const childRoutes = Array.isArray(route?.routes)
      ? route.routes
      : Array.isArray(route?.children)
        ? route.children
        : GLOBAL_SEARCH_EMPTY_RESULTS;
    if (childRoutes.length === 0) {
      return;
    }
    // `childPath`：传给下一递归层的完整父路径，必须保留所有祖先相对段；空容器沿用原父路径。
    const childPath = routePath ? fullPath : parentPath;
    // `childTitle`：下一层的完整父标题链；当前节点没有标题时沿用已有链。
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
export function getGlobalSearchResultIdentity(
  /* `item`：直接匹配遍历的当前菜单项，原样存入匹配记录，不修改原对象。 */ item
) {
  // `safePath`：结果去重使用的路径文本，缺失为空串；不负责导航来源验证。
  const safePath = String(item?.path ?? '');
  // `safeTitle`：结果去重使用的显示标题文本，与路径和完整标题共同构成身份。
  const safeTitle = String(item?.title ?? '');
  // `safeFullTitle`：结果去重使用的层级标题文本，用于区分同路径的不同显示声明。
  const safeFullTitle = String(item?.fullTitle ?? '');
  return `${safePath}::${safeTitle}::${safeFullTitle}`;
}

/**
 * 统一规整菜单项上参与搜索的文本字段，避免每轮匹配重复做空值处理。
 * @param {{ title?: string, fullTitle?: string, path?: string }} item 当前菜单项。
 * @returns {{ title: string, fullTitle: string, path: string }} 规整后的搜索字段。
 */
export function normalizeGlobalSearchSearchFields(
  /* `item`：直接匹配遍历的当前菜单项，原样存入匹配记录，不修改原对象。 */ item
) {
  // `title`：当前菜单标题的文本形式，用于普通、大小写和拼音匹配。
  const title = String(item?.title ?? '');
  // `fullTitle`：已规整的层级标题，在单标题未命中时继续匹配。
  const fullTitle = String(item?.fullTitle ?? '');
  // `path`：当前菜单路径的安全文本，用于子串搜索，不访问该地址。
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
  // `title`：已规整的当前标题，本函数按固定优先级尝试直接文本与拼音匹配。
  const title = searchFields.title;
  // `fullTitle`：父标题链与当前标题组合的层级文案，帮助区分同名菜单。
  const fullTitle = searchFields.fullTitle;
  // `path`：已规整的路径，只做大小写无关子串匹配。
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
  // `stableRouteItems`：用于 Fuse 的可遍历条目数组；为空时不创建索引。
  const stableRouteItems = ensureArray(routeItems, GLOBAL_SEARCH_EMPTY_RESULTS);
  if (stableRouteItems.length === 0) {
    return GLOBAL_SEARCH_EMPTY_RESULTS;
  }
  // `fuse`：本次调用建立的本地 Fuse 索引，仅搜索已提供菜单，不涉及网络或磁盘。
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
  // `stableRouteItems`：本次完整待搜索条目数组，直接匹配和模糊匹配共用它。
  const stableRouteItems = ensureArray(routeItems, GLOBAL_SEARCH_EMPTY_RESULTS);
  // `keyword`：输入收窄并 trim 后的查询词，空词不返回默认菜单列表。
  const keyword = String(searchValue ?? '').trim();
  if (!keyword) {
    return GLOBAL_SEARCH_EMPTY_RESULTS;
  }
  // `keywordLower`：查询词的小写版本，用于大小写无关和拼音匹配，不改变实际显示标题。
  const keywordLower = keyword.toLowerCase();
  // `matchedRouteItemMap`：本次按稳定身份去重的匹配表；直接匹配先写入，fuzzy 不覆盖更高优先级项。
  const matchedRouteItemMap = new Map();

  stableRouteItems.forEach(
    (
      /* `item`：直接匹配遍历的当前菜单项，原样存入匹配记录，不修改原对象。 */ item,
      /* `index`：条目在原目录中的零起始位置，同优先级用它保持声明顺序。 */ index
    ) => {
      // `searchFields`：当前条目的 title/fullTitle/path 规整结果，避免各匹配分支重复处理空值。
      const searchFields = normalizeGlobalSearchSearchFields(item);
      // `priority`：当前条目命中的第一种直接匹配优先级，null 表示留给模糊补充。
      const priority = resolveGlobalSearchDirectMatchPriority(searchFields, keyword, keywordLower);
      if (priority === null) {
        return;
      }
      // `identity`：直接匹配条目的稳定去重键，由路径/标题/完整标题组合。
      const identity = getGlobalSearchResultIdentity(item);
      matchedRouteItemMap.set(identity, {
        item,
        index,
        priority,
      });
    }
  );
  // `fuzzyMatches`：Fuse 返回的补充匹配记录，含原项、来源下标和可选 score。
  const fuzzyMatches = searchGlobalSearchFuzzyResults(stableRouteItems, keyword);
  fuzzyMatches.forEach((/* `result`：Fuse 当前匹配记录；已直接命中则跳过，无 score 使用最差默认。 */ result) => {
    // `identity`：当前模糊匹配条目的去重键，已被直接命中时跳过。
    const identity = getGlobalSearchResultIdentity(result?.item);
    if (matchedRouteItemMap.has(identity)) {
      return;
    }
    // `fuzzyScore`：Fuse 的有限 score 或最差默认 1；加到 fuzzyBase 后不会抢在直接匹配之前。
    const fuzzyScore = Number.isFinite(result?.score) ? result.score : 1;
    matchedRouteItemMap.set(identity, {
      item: result?.item,
      index: Number.isFinite(result?.refIndex) ? result.refIndex : stableRouteItems.length,
      priority: GLOBAL_SEARCH_MATCH_PRIORITY.fuzzyBase + fuzzyScore,
    });
  });
  // `sortedMatchedRouteItems`：去重记录按优先级、同级原目录顺序排序的新数组，截断后只返回原条目。
  const sortedMatchedRouteItems = Array.from(matchedRouteItemMap.values()).sort(
    (
      /* `left`：排序比较的左侧匹配记录，先比较 priority 再比较原 index。 */ left,
      /* `right`：排序比较的右侧匹配记录，比较过程不改变原菜单项。 */ right
    ) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.index - right.index;
    }
  );
  return sortedMatchedRouteItems
    .slice(0, GLOBAL_SEARCH_RESULT_LIMIT)
    .map((/* `matchedRouteItem`：截取最终上限后的匹配记录，仅取其原 item 交给 UI。 */ matchedRouteItem) => {
      return matchedRouteItem.item;
    });
}

/**
 * 判断是否允许由菜单搜索接管 Ctrl/Cmd+K。
 * @param {Object} event 原生或 React 键盘事件；key 按浏览器字符串处理，兼容大写 K。
 * @returns {boolean} 重复键、已消费事件、输入法组合态/229、输入/选择/编辑区域一律 false；只检测不调用 preventDefault。
 */
export function isGlobalSearchShortcut(event) {
  // `safeEvent`：当前键盘事件的对象形态，缺失/非对象不处理；不向 UI 发布状态。
  const safeEvent = event && typeof event === 'object' ? event : null;
  if (!canHandleGlobalSearchKey(safeEvent)) return false;
  // `target`：键盘事件真实目标；输入/选择/编辑区域保留自身快捷键，不强行打开菜单搜索。
  const target = safeEvent.target;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) return false;
  return (
    Boolean(safeEvent.ctrlKey || safeEvent.metaKey) &&
    typeof safeEvent.key === 'string' &&
    safeEvent.key.toLowerCase() === 'k'
  );
}

/**
 * 判断当前键盘事件是否仍可由搜索组件消费，不抢占输入法确认或控件已处理的动作。
 * @param {Object|null} event 原生或 React 键盘事件，兼容 nativeEvent 和输入法 229 码。
 * @returns {boolean} false 包含缺少事件、重复按键、已阻止默认和组合输入阶段。
 */
function canHandleGlobalSearchKey(event) {
  return Boolean(
    event &&
    typeof event === 'object' &&
    !event.repeat &&
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.nativeEvent?.isComposing &&
    event.keyCode !== 229 &&
    event.nativeEvent?.keyCode !== 229
  );
}

/**
 * 将搜索输入框的有效 Enter/Escape 投影为界面动作，供组件与回归测试共用。
 * @param {Object|null} event 当前输入框的原生或 React 键盘事件，不读取 DOM 或路由。
 * @returns {'select'|'close'|null} select 由 UI 选择首项，close 请求关闭；其它键和输入法事件为 null。
 * 本函数只判定；UI 仍须确认当前有可选结果，取消/导航的副作用在组件执行。
 */
export function resolveGlobalSearchKeyAction(event) {
  if (!canHandleGlobalSearchKey(event)) return null;
  return event.key === 'Enter' ? 'select' : event.key === 'Escape' ? 'close' : null;
}

// ───── 模块结束：src/components/GlobalSearch/utils.js ─────
