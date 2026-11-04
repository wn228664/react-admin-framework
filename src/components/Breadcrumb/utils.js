/**
 * 模块职责：规整路径、匹配动态段并递归构建面包屑数据，供顶部导航展示。
 * 路由标题优先读取 meta.title/title/name；隐藏 breadcrumb 的节点不进入结果，首页按需要补一次。
 * 不解释特定业务查询参数，不发请求或访问浏览器历史；异常列表由类型收窄工具处理。
 */
// 未就绪路由收敛为空数组，无效路径收敛为空串，避免匹配阶段因输入形状异常抛错。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 * `ensureString`：把可确定的标量转成展示文本，避免对象意外渲染为 [object Object]。
 */
import { ensureArray, ensureString } from '@/utils/robust';
// `BREADCRUMB_HOME_PATH`：框架首页的站内绝对路径 /dashboard，补首页项与首页去重共用。
export const BREADCRUMB_HOME_PATH = '/dashboard';
// `BREADCRUMB_HOME_TITLE`：补首页项的固定中文标题，不读取业务 query 或远端正文。
export const BREADCRUMB_HOME_TITLE = '首页';
// `BREADCRUMB_ROOT_PATH`：路由根路径 /；规整尾斜杠时保留该根路径本身。
export const BREADCRUMB_ROOT_PATH = '/';
/**
 * 标准化路径，移除末尾斜杠并保持根路径为 `/`。
 * @param {*} path 待规整路径。
 * @returns {string} 规整后的路径。
 */
export function normalizeBreadcrumbPath(path) {
  // `safePath`：输入 path 收窄的文本，空值不参与匹配；不执行 URL 跳转。
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
  // `normalizedRoutePath`：去末尾斜杠后的声明路径，用于静态或冒号动态段的匹配。
  const normalizedRoutePath = normalizeBreadcrumbPath(routePath);
  // `normalizedTargetPath`：去末尾斜杠后的当前 pathname，和声明路径使用相同分段规则。
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

  // `routeSegments`：声明路径按 / 分割的段数组，冒号开头段可匹配任意同位置段。
  const routeSegments = normalizedRoutePath.split('/');
  // `targetSegments`：当前路径按 / 分割的段数组；长度必须与声明一致，不作前缀误匹配。
  const targetSegments = normalizedTargetPath.split('/');
  if (routeSegments.length !== targetSegments.length) {
    return false;
  }

  return routeSegments.every(
    (
      /* `segment`：声明路径当前段，冒号开头视为动态参数占位，其它段严格匹配。 */ segment,
      /* `index`：当前路径段的零起始下标；两侧长度相同后读取目标同位置。 */ index
    ) => {
      if (segment.startsWith(':')) {
        return true;
      }
      return segment === targetSegments[index];
    }
  );
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
  // `normalizedTargetPath`：递归查找使用的标准目标路径，各层传同一值，不从查询字段推导。
  const normalizedTargetPath = normalizeBreadcrumbPath(targetPath);
  // `stableRouteList`：当前层可遍历路由数组；无效输入收窄为空数组，避免递归抛错。
  const stableRouteList = ensureArray(routeList);

  // `route`：当前层遍历到的声明路由，只读其 path/meta/children/routes。
  for (const route of stableRouteList) {
    // `routePath`：当前节点自己的 path 文本，空路径沿用父级完整路径。
    const routePath = ensureString(route?.path);
    // `fullPath`：由父路径与当前相对段合成的完整匹配路径；绝对路径直接取节点声明。
    let fullPath = parentPath;
    if (routePath) {
      fullPath = routePath.startsWith(BREADCRUMB_ROOT_PATH)
        ? routePath
        : parentPath
          ? `${parentPath}/${routePath}`
          : `${BREADCRUMB_ROOT_PATH}${routePath}`;
    }
    fullPath = normalizeBreadcrumbPath(fullPath.replace(/\/+/g, '/'));

    // `routeWithFullPath`：附加 fullPath 的路由浅副本，不污染原路由配置。
    const routeWithFullPath = { ...route, fullPath };
    if (breadcrumbPathMatches(fullPath, normalizedTargetPath)) {
      return [...parentRoutes, routeWithFullPath];
    }

    // `childRoutes`：当前节点子树，children 优先、routes 兜底，否则空数组。
    const childRoutes = Array.isArray(route?.children)
      ? route.children
      : Array.isArray(route?.routes)
        ? route.routes
        : [];
    if (childRoutes.length === 0) {
      continue;
    }

    // `matchedChildRoutes`：递归命中的完整父子链；非空就返回，不继续匹配同层其它分支。
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
  // `stableBreadcrumbEntries`：当前面包屑条目的安全数组，供首页标题/路径去重判定。
  const stableBreadcrumbEntries = ensureArray(breadcrumbEntries);
  return stableBreadcrumbEntries.some(
    (/* `entry`：当前已生成的面包屑项；标题为首页或路径为首页/根路径均视为已含首页。 */ entry) => {
      return entry?.title === BREADCRUMB_HOME_TITLE || entry?.path === BREADCRUMB_HOME_PATH || entry?.path === '/';
    }
  );
}

/**
 * 按实际 pathname 生成标题链，动态菜单未命中时尝试静态路由。
 * @param {Object} options pathname 为站内路径，routes/staticRoutes 为已校验的路由树。
 * @returns {Array<Object>} title/path 条目；首页本身返回空列表，缺少首页时在已匹配链前补一次。
 * 查询字段不参与标题判定，需要动态业务文案时由接入层显式更新路由元数据。
 */
export function buildBreadcrumbEntries({
  /* `pathname`：当前站内页面路径，不含业务标题参数；查询和 hash 不参与标题链。 */ pathname,
  /* `routes`：当前动态菜单树，优先用于完整路由链查找，不修改原树。 */ routes,
  /* `staticRoutes`：框架静态路由树，仅在动态树未命中时作为展示兜底。 */ staticRoutes,
}) {
  // `normalizedPathname`：当前页面 pathname 的标准值，首页和根路径不显示额外面包屑。
  const normalizedPathname = normalizeBreadcrumbPath(pathname);
  if (normalizedPathname === BREADCRUMB_HOME_PATH || normalizedPathname === BREADCRUMB_ROOT_PATH) {
    return [];
  }

  // `matchedRoutes`：动态菜单优先命中的链；未命中才使用静态框架路由兜底。
  let matchedRoutes = findMatchedBreadcrumbRoutes(routes, normalizedPathname);
  if (matchedRoutes.length === 0) {
    matchedRoutes = findMatchedBreadcrumbRoutes(staticRoutes, normalizedPathname);
  }

  // `breadcrumbEntries`：本次新建的展示链，仅收集有标题且未 meta.breadcrumb=false 的节点。
  const breadcrumbEntries = [];
  matchedRoutes.forEach(
    (/* `route`：匹配链中的当前节点；用其元数据决定是否生成展示项，不创建可点击业务链接。 */ route) => {
      // `title`：当前命中路由按 meta.title、title、name 优先取得的展示文案。
      const title = route?.meta?.title || route?.title || route?.name;

      if (title && route?.meta?.breadcrumb !== false) {
        breadcrumbEntries.push({
          title,
          path: route.fullPath,
        });
      }
    }
  );

  if (breadcrumbEntries.length > 0 && !hasBreadcrumbHomeEntry(breadcrumbEntries)) {
    breadcrumbEntries.unshift({
      title: BREADCRUMB_HOME_TITLE,
      path: BREADCRUMB_HOME_PATH,
      isHome: true,
    });
  }

  return breadcrumbEntries;
}

// ───── 模块结束：src/components/Breadcrumb/utils.js ─────
