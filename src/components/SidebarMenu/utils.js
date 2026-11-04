/**
 * 模块职责：规整菜单路径、匹配动态段并构造展示模型、选中项与手风琴展开状态。
 * 兼容 children/routes 两种声明；单个可见子项可以折叠为直接入口，外链与站内路径分开处理。
 * 只生成数据，不发导航、不访问 DOM，也不为外链目标或远程菜单内容作可信背书。
 */
// 数组和字符串收窄保持菜单未就绪时可安全返回空模型。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 * `ensureString`：把可确定的标量转成展示文本，避免对象意外渲染为 [object Object]。
 */
import { ensureArray, ensureString } from '@/utils/robust';
// HTTP(S) 外链形状与站内路径分流；实际外链是否可信由接入层确认。
/**
 * `isExternalPath`：判断 path 是否以受支持的外部协议开头，大小写不敏感；空值先转为空串。
 */
import { isExternalPath } from '@/utils/nav';
// `SIDEBAR_MENU_EMPTY_ITEMS`：共享冻结空列表，作为未就绪菜单/展开链的兜底，不能原地修改。
export const SIDEBAR_MENU_EMPTY_ITEMS = Object.freeze([]);
// `SIDEBAR_MENU_DEFAULT_TITLE`：节点没有 meta.title 或 name 时的中性显示标题“未命名菜单”。
export const SIDEBAR_MENU_DEFAULT_TITLE = '未命名菜单';
/**
 * 统一规整菜单 key/path，移除末尾斜杠并保留根路径 `/`。
 * @param {*} path 待规整路径。
 * @returns {string} 规整后的菜单 key。
 */
export function normalizeSidebarMenuKey(path) {
  // `safePath`：待规范化的菜单路径文本；根路径保留，其余去掉尾部斜杠。
  const safePath = ensureString(path);
  if (!safePath) {
    return '';
  }

  return safePath === '/' ? '/' : safePath.replace(/\/+$/, '');
}

/**
 * 解析菜单树中的完整路径，兼容外链、绝对路径、相对路径和无 path 的容器节点。
 * @param {*} basePath 父级路径。
 * @param {*} routePath 当前节点 path。
 * @returns {string} 解析后的完整路径。
 */
export function resolveSidebarPath(basePath, routePath) {
  // `safeBasePath`：父级完整路径的字符串形式，空子路径沿用它；外链父节点不拼站内路径。
  const safeBasePath = ensureString(basePath);
  // `safeRoutePath`：当前节点路径文本，显式外链或绝对路径优先，其余与完整父路径拼接。
  const safeRoutePath = ensureString(routePath);
  if (!safeRoutePath) {
    return safeBasePath || '';
  }

  if (isExternalPath(safeRoutePath)) {
    return safeRoutePath;
  }
  if (isExternalPath(safeBasePath)) {
    return safeBasePath;
  }
  if (safeRoutePath.startsWith('/')) {
    return normalizeSidebarMenuKey(safeRoutePath);
  }

  return normalizeSidebarMenuKey(
    safeBasePath ? `${safeBasePath}/${safeRoutePath}`.replace(/\/+/g, '/') : `/${safeRoutePath}`
  );
}

/**
 * 判断目标路径是否命中当前路由路径，兼容动态参数段。
 * @param {*} routePath 路由定义中的 path。
 * @param {*} targetPath 当前 pathname。
 * @returns {boolean} 是否命中。
 */
export function sidebarPathMatches(routePath, targetPath) {
  // `normalizedRoutePath`：用于匹配的标准声明路径，不含路由参数实值替换。
  const normalizedRoutePath = normalizeSidebarMenuKey(routePath);
  // `normalizedTargetPath`：用于匹配的标准当前 pathname；动态段仍要求两侧段数相等。
  const normalizedTargetPath = normalizeSidebarMenuKey(targetPath);
  if (!normalizedRoutePath || !normalizedTargetPath) {
    return false;
  }

  if (normalizedRoutePath === normalizedTargetPath) {
    return true;
  }

  if (!normalizedRoutePath.includes(':')) {
    return false;
  }

  // `routeSegments`：声明路径分段数组，冒号开头段作为当前位置动态参数占位。
  const routeSegments = normalizedRoutePath.split('/');
  // `targetSegments`：当前路径分段数组，与声明路径按同位置比较，不做宽松前缀匹配。
  const targetSegments = normalizedTargetPath.split('/');
  if (routeSegments.length !== targetSegments.length) {
    return false;
  }

  return routeSegments.every(
    (
      /* `segment`：声明路径的当前段，冒号段允许匹配目标同位置任意文本。 */ segment,
      /* `index`：路径段零起始位置，两侧长度一致后进行同位置比较。 */ index
    ) => {
      return segment.startsWith(':') || segment === targetSegments[index];
    }
  );
}

/**
 * 在不改变菜单展示规则的前提下，递归查找当前 pathname 对应的路由配置。
 * 说明：这里不会跳过 hidden 路由，因为选中态解析需要读取详情页的 `meta.activeMenu`。
 * @param {*} routeList 当前层级路由数组。
 * @param {*} targetPath 当前 pathname。
 * @param {string} parentPath 父级完整路径。
 * @returns {Record<string, any> | null} 命中的路由配置。
 */
export function findSidebarMatchedRoute(routeList, targetPath, parentPath = '') {
  // `stableRouteList`：当前递归层的安全路由数组，隐藏节点也参与 activeMenu 匹配。
  const stableRouteList = ensureArray(routeList, SIDEBAR_MENU_EMPTY_ITEMS);
  // `normalizedTargetPath`：递归查找使用的标准目标路径；空路径直接返回未命中。
  const normalizedTargetPath = normalizeSidebarMenuKey(targetPath);
  if (!normalizedTargetPath) {
    return null;
  }

  // `route`：当前查找层遍历的原路由节点，只读配置，命中返回附 fullPath 的副本。
  for (const route of stableRouteList) {
    // `fullPath`：当前节点相对父级解析的完整路径，和目标 pathname 比较。
    const fullPath = resolveSidebarPath(parentPath, route?.path);
    if (sidebarPathMatches(fullPath, normalizedTargetPath)) {
      return {
        ...route,
        fullPath,
      };
    }

    // `childRoutes`：查找阶段当前子树，children 优先、routes 兜底，允许定位隐藏详情页。
    const childRoutes = Array.isArray(route?.children)
      ? route.children
      : Array.isArray(route?.routes)
        ? route.routes
        : SIDEBAR_MENU_EMPTY_ITEMS;
    if (childRoutes.length === 0) {
      continue;
    }

    // `matchedRoute`：当前子树递归命中的节点，包含完整路径，命中即停止本层继续搜索。
    const matchedRoute = findSidebarMatchedRoute(childRoutes, normalizedTargetPath, fullPath);
    if (matchedRoute) {
      return matchedRoute;
    }
  }

  return null;
}
/**
 * 判断当前节点是否只有一个可展示子菜单。
 * @param {*} children 子路由数组。
 * @param {Record<string, any>} parent 父级路由。
 * @returns {{ show: boolean, child: Record<string, any> | null }} 是否折叠展示及对应节点。
 */
export function findSidebarSingleVisibleChild(children = [], parent) {
  // `visibleChildren`：仅剔除 hidden 的直接子项新数组，用于单子项折叠显示判断。
  const visibleChildren = ensureArray(children, SIDEBAR_MENU_EMPTY_ITEMS).filter(
    (/* `item`：直接子路由候选，只根据 hidden 字段过滤，不为其补权限。 */ item) => {
      return !item?.hidden;
    }
  );

  if (visibleChildren.length === 1) {
    return {
      show: true,
      child: visibleChildren[0],
    };
  }

  if (visibleChildren.length === 0) {
    return {
      show: true,
      child: {
        ...parent,
        path: '',
        noShowingChildren: true,
      },
    };
  }

  return {
    show: false,
    child: null,
  };
}

/**
 * 为 UI 分流保留菜单地址并标记支持的外链形状。
 * @param {string} path 当前已解析的菜单路径，可保留查询文本；不会从 route/query 猜测跳转参数。
 * @returns {{targetPath:string,isExternal:boolean}} 不产生导航、不校验目标内容，调用方决定站内 history 或外部窗口。
 */
export function resolveSidebarNavigationTarget(path) {
  // `targetPath`：导航入口原始路径，保留其查询部分；此函数只判定外链，不发起导航。
  const targetPath = path;
  return {
    targetPath,
    isExternal: isExternalPath(targetPath),
  };
}

/**
 * 递归构建供 SidebarMenu 组件渲染的纯菜单模型。
 * @param {*} routes 菜单路由树。
 * @param {string} basePath 父级完整路径。
 * @returns {Array<{ key: string, title: string, iconName?: string, targetPath?: string, isExternal?: boolean, children?: Array<Record<string, any>> }>} 纯菜单模型。
 */
export function buildSidebarMenuModel(routes, basePath = '') {
  // `stableRoutes`：展示构建阶段的安全原路由数组，hidden 节点不生成菜单模型。
  const stableRoutes = ensureArray(routes, SIDEBAR_MENU_EMPTY_ITEMS);
  if (stableRoutes.length === 0) {
    return SIDEBAR_MENU_EMPTY_ITEMS;
  }

  // `menuModel`：当前层新建的纯展示数组，不包含事件回调或 React 节点。
  const menuModel = [];

  stableRoutes.forEach((/* `route`：展示构建中的当前原节点，hidden 跳过整树，alwaysShow 控制单子项折叠。 */ route) => {
    if (route?.hidden) {
      return;
    }

    // `currentPath`：当前展示节点相对父路径解析的完整路径，作为子树基准和默认 key。
    const currentPath = resolveSidebarPath(basePath, route?.path);
    // `childRoutes`：展示阶段的子树数组，随后按可见子项数量决定直接入口或层级。
    const childRoutes = Array.isArray(route?.children)
      ? route.children
      : Array.isArray(route?.routes)
        ? route.routes
        : SIDEBAR_MENU_EMPTY_ITEMS;
    // `show`：是否可把当前节点折叠成单一入口；alwaysShow=true 时仍保留层级。
    // `child`：单一可见子项，或无可见子项时构造的当前父节点占位；不写回原树。
    const { show, child } = findSidebarSingleVisibleChild(childRoutes, route);

    if (show && !route?.alwaysShow) {
      // `childPath`：折叠后真正可点击子项的完整路径，不依赖标题字符串。
      const childPath = resolveSidebarPath(currentPath, child?.path);
      // `childMeta`：折叠入口的元数据；图标可回退父图标，标题可回退原 route.name。
      const childMeta = child?.meta || {};
      // `targetPath`：折叠入口的最终跳转地址，保留查询文本。
      // `isExternal`：折叠入口是否满足通用外链协议形状，实际可信度由接入层确认。
      const { targetPath, isExternal } = resolveSidebarNavigationTarget(childPath, child);
      menuModel.push({
        key: childPath,
        iconName: childMeta.icon || route?.meta?.icon,
        title: childMeta.title || route?.name || SIDEBAR_MENU_DEFAULT_TITLE,
        targetPath,
        isExternal,
      });
      return;
    }

    // `routeMeta`：普通父/叶节点的元数据，提供图标和标题，不生成权限。
    const routeMeta = route?.meta || {};
    // `children`：递归构建的可展示子模型；非空时当前节点生成子菜单而不是直接入口。
    const children = buildSidebarMenuModel(childRoutes, currentPath);
    if (children.length > 0) {
      menuModel.push({
        key: currentPath,
        iconName: routeMeta.icon,
        title: routeMeta.title || route?.name || SIDEBAR_MENU_DEFAULT_TITLE,
        children,
      });
      return;
    }

    // `targetPath`：没有可展示子模型时的叶节点最终地址。
    // `isExternal`：叶入口是否属于支持的外链协议，仅供 UI 导航分流。
    const { targetPath, isExternal } = resolveSidebarNavigationTarget(currentPath, route);
    menuModel.push({
      key: currentPath,
      iconName: routeMeta.icon,
      title: routeMeta.title || route?.name || SIDEBAR_MENU_DEFAULT_TITLE,
      targetPath,
      isExternal,
    });
  });

  return menuModel;
}
/**
 * 解析当前 pathname 应该高亮的菜单 key。
 * 说明：若命中的详情/隐藏路由声明了 `meta.activeMenu`，优先高亮该菜单 key。
 * @param {{ pathname?: string, routes?: Array<Record<string, any>> }} options 解析参数。
 * @returns {string} 当前高亮的菜单 key。
 */
export function resolveSidebarSelectedKey({ pathname, routes }) {
  // `normalizedPathname`：当前 pathname 的标准形式，用于定位隐藏页及其 activeMenu。
  const normalizedPathname = normalizeSidebarMenuKey(pathname);
  if (!normalizedPathname) {
    return '';
  }

  // `matchedRoute`：当前路径命中的声明节点，可通过 meta.activeMenu 指向可见父菜单。
  const matchedRoute = findSidebarMatchedRoute(routes, normalizedPathname);
  // `activeMenu`：详情/隐藏路由明确声明的高亮目标，缺失时使用当前 pathname。
  const activeMenu = ensureString(matchedRoute?.meta?.activeMenu);
  return normalizeSidebarMenuKey(activeMenu || normalizedPathname);
}

/**
 * 根据当前高亮菜单 key 生成默认展开链。
 * @param {*} activeKey 当前高亮菜单 key。
 * @returns {string[]} 对应的父级展开链。
 */
export function buildSidebarOpenKeys(activeKey) {
  // `normalizedActiveKey`：高亮项的标准路径，根路径或外链不生成站内父级展开链。
  const normalizedActiveKey = normalizeSidebarMenuKey(activeKey);
  if (!normalizedActiveKey || normalizedActiveKey === '/' || isExternalPath(normalizedActiveKey)) {
    return SIDEBAR_MENU_EMPTY_ITEMS;
  }

  // `pathSegments`：去掉空段的站内路径层级，按前缀逐级生成展开 key。
  const pathSegments = normalizedActiveKey.split('/').filter(Boolean);
  return pathSegments.map(
    (
      /* `_`：路径段本身在展开链构造中不读取，只使用下标决定当前前缀长度。 */ _,
      /* `index`：展开前缀的结束段位置，从 0 开始，每次包含该段。 */ index
    ) => {
      return `/${pathSegments.slice(0, index + 1).join('/')}`;
    }
  );
}

/**
 * 处理手风琴模式下的菜单展开/收起状态。
 * @param {{
 *   nextOpenKeys?: string[],
 *   previousOpenKeys?: string[],
 *   collapsed?: boolean
 * }} options 展开状态参数。
 * @returns {{ openKeys: string[], latestOpenKey: string | null }} 新展开链与最新展开项。
 */
export function buildSidebarAccordionState({ nextOpenKeys, previousOpenKeys, collapsed }) {
  if (collapsed) {
    return {
      openKeys: SIDEBAR_MENU_EMPTY_ITEMS,
      latestOpenKey: null,
    };
  }

  // `stableNextOpenKeys`：展开事件的规范化 key 数组；结果归新数组，空键被过滤。
  const stableNextOpenKeys = ensureArray(nextOpenKeys, SIDEBAR_MENU_EMPTY_ITEMS)
    .map((/* `key`：本次展开 key 候选，规范尾斜杠后再过滤空值。 */ key) => normalizeSidebarMenuKey(key))
    .filter(Boolean);
  // `previousKeySet`：前次标准展开 key 的去重集合，用于找出新打开的分支。
  const previousKeySet = new Set(
    ensureArray(previousOpenKeys, SIDEBAR_MENU_EMPTY_ITEMS)
      .map((/* `key`：前次展开 key 候选，使用同一规则便于集合比较。 */ key) => normalizeSidebarMenuKey(key))
      .filter(Boolean)
  );

  // `latestOpenKey`：本次列表中首个以前不存在的 key；没有新增则保留当前收起结果。
  const latestOpenKey = stableNextOpenKeys.find(
    (/* `key`：本次规范化 key，寻找第一个不在前次集合中的新分支。 */ key) => {
      return !previousKeySet.has(key);
    }
  );
  if (!latestOpenKey) {
    return {
      openKeys: stableNextOpenKeys,
      latestOpenKey: null,
    };
  }

  return {
    openKeys: buildSidebarOpenKeys(latestOpenKey),
    latestOpenKey,
  };
}

// ───── 模块结束：src/components/SidebarMenu/utils.js ─────
