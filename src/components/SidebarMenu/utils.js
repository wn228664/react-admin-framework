/**
 * @file src/components/SidebarMenu/utils.js
 * @description SidebarMenu 共享 helper，统一处理菜单路径解析、可见子项折叠、选中态/展开态计算与菜单模型构建。
 * @example
 * const menuModel = buildSidebarMenuModel(routes);
 * const selectedKey = resolveSidebarSelectedKey({ pathname: '/system/dict/data/8', routes });
 */
import { ensureArray, ensureString } from '@/utils/robust';
import { isExternalPath } from '@/utils/nav';
export const SIDEBAR_MENU_EMPTY_ITEMS = Object.freeze([]);
export const SIDEBAR_MENU_DEFAULT_TITLE = '未命名菜单';
/**
 * 统一规整菜单 key/path，移除末尾斜杠并保留根路径 `/`。
 * @param {*} path 待规整路径。
 * @returns {string} 规整后的菜单 key。
 */
export function normalizeSidebarMenuKey(path) {
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
  const safeBasePath = ensureString(basePath);
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
  const normalizedRoutePath = normalizeSidebarMenuKey(routePath);
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
 * 在不改变菜单展示规则的前提下，递归查找当前 pathname 对应的路由配置。
 * 说明：这里不会跳过 hidden 路由，因为选中态解析需要读取详情页的 `meta.activeMenu`。
 * @param {*} routeList 当前层级路由数组。
 * @param {*} targetPath 当前 pathname。
 * @param {string} parentPath 父级完整路径。
 * @returns {Record<string, any> | null} 命中的路由配置。
 */
export function findSidebarMatchedRoute(routeList, targetPath, parentPath = '') {
  const stableRouteList = ensureArray(routeList, SIDEBAR_MENU_EMPTY_ITEMS);
  const normalizedTargetPath = normalizeSidebarMenuKey(targetPath);
  if (!normalizedTargetPath) {
    return null;
  }

  for (const route of stableRouteList) {
    const fullPath = resolveSidebarPath(parentPath, route?.path);
    if (sidebarPathMatches(fullPath, normalizedTargetPath)) {
      return {
        ...route,
        fullPath,
      };
    }

    const childRoutes = Array.isArray(route?.children)
      ? route.children
      : Array.isArray(route?.routes)
        ? route.routes
        : SIDEBAR_MENU_EMPTY_ITEMS;
    if (childRoutes.length === 0) {
      continue;
    }

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
  const visibleChildren = ensureArray(children, SIDEBAR_MENU_EMPTY_ITEMS).filter((item) => {
    return !item?.hidden;
  });

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
 * 计算菜单项跳转目标，保留原始查询参数并判断是否外链。
 * @param {*} path 菜单项 key/path。
 * @param {*} route 当前路由节点。
 * @returns {{ targetPath: string, isExternal: boolean }} 目标路径与是否外链。
 */
export function resolveSidebarNavigationTarget(path) {
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
  const stableRoutes = ensureArray(routes, SIDEBAR_MENU_EMPTY_ITEMS);
  if (stableRoutes.length === 0) {
    return SIDEBAR_MENU_EMPTY_ITEMS;
  }

  const menuModel = [];

  stableRoutes.forEach((route) => {
    if (route?.hidden) {
      return;
    }

    const currentPath = resolveSidebarPath(basePath, route?.path);
    const childRoutes = Array.isArray(route?.children)
      ? route.children
      : Array.isArray(route?.routes)
        ? route.routes
        : SIDEBAR_MENU_EMPTY_ITEMS;
    const { show, child } = findSidebarSingleVisibleChild(childRoutes, route);

    if (show && !route?.alwaysShow) {
      const childPath = resolveSidebarPath(currentPath, child?.path);
      const childMeta = child?.meta || {};
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

    const routeMeta = route?.meta || {};
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
  const normalizedPathname = normalizeSidebarMenuKey(pathname);
  if (!normalizedPathname) {
    return '';
  }

  const matchedRoute = findSidebarMatchedRoute(routes, normalizedPathname);
  const activeMenu = ensureString(matchedRoute?.meta?.activeMenu);
  return normalizeSidebarMenuKey(activeMenu || normalizedPathname);
}

/**
 * 根据当前高亮菜单 key 生成默认展开链。
 * @param {*} activeKey 当前高亮菜单 key。
 * @returns {string[]} 对应的父级展开链。
 */
export function buildSidebarOpenKeys(activeKey) {
  const normalizedActiveKey = normalizeSidebarMenuKey(activeKey);
  if (!normalizedActiveKey || normalizedActiveKey === '/' || isExternalPath(normalizedActiveKey)) {
    return SIDEBAR_MENU_EMPTY_ITEMS;
  }

  const pathSegments = normalizedActiveKey.split('/').filter(Boolean);
  return pathSegments.map((_, index) => {
    return `/${pathSegments.slice(0, index + 1).join('/')}`;
  });
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

  const stableNextOpenKeys = ensureArray(nextOpenKeys, SIDEBAR_MENU_EMPTY_ITEMS)
    .map((key) => normalizeSidebarMenuKey(key))
    .filter(Boolean);
  const previousKeySet = new Set(
    ensureArray(previousOpenKeys, SIDEBAR_MENU_EMPTY_ITEMS)
      .map((key) => normalizeSidebarMenuKey(key))
      .filter(Boolean)
  );

  const latestOpenKey = stableNextOpenKeys.find((key) => {
    return !previousKeySet.has(key);
  });
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
