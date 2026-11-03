/**
 * @file src/components/SidebarMenu/index.jsx
 * @description 左侧导航菜单组件，负责把动态菜单树渲染为可展开的 Ant Design Menu，并维持高亮、滚动显露和点击跳转。
 * @example
 * <SidebarMenu routes={menu.routes} collapsed={!app.sidebar.opened} />
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu } from 'antd';
import { history, useLocation } from 'umi';
import * as Icons from '@ant-design/icons';
import { attachDockMagnify } from '@/utils/dockMagnify';
import {
  buildSidebarAccordionState,
  buildSidebarMenuModel,
  buildSidebarOpenKeys,
  resolveSidebarSelectedKey,
} from './utils';
import './index.less';
const SIDEBAR_DOCK_MAGNIFY_OPTIONS = {
  itemSelector: '.ant-menu-item, .ant-menu-submenu-title',
  axis: 'y',
  radius: 90,
  maxScale: 1.06,
  maxLift: 4,
  falloff: 2,
  activeClass: 'ant-menu-item-selected',
  activeBoost: 0,
  pointerTypes: ['mouse', 'pen'],
};
const SIDEBAR_REVEAL_RECHECK_DELAY = 260;
const SIDEBAR_REVEAL_PADDING = 8;
/**
 * 动态获取图标组件。
 * @param {*} iconName 图标名称。
 * @returns {JSX.Element | null} 对应图标组件；缺失时返回 null。
 */
const getIcon = (iconName) => {
  const safeIconName = String(iconName ?? '');
  if (!safeIconName) {
    return null;
  }

  const IconComponent = Icons[safeIconName];
  return IconComponent ? <IconComponent /> : null;
};

/**
 * 给菜单标题增加可定位标记，供展开后自动滚动显露使用。
 * @param {*} text 菜单标题。
 * @param {*} key 菜单 key。
 * @returns {JSX.Element} 带 `data-menu-key` 的标题节点。
 */
const renderMenuLabel = (text, key) => {
  return (
    <span className="framework-menu-title" data-menu-key={key}>
      {String(text ?? '')}
    </span>
  );
};

/**
 * 把纯菜单模型映射为 antd Menu items。
 * @param {Array<Record<string, any>>} menuModel 纯菜单模型。
 * @param {(menuItem: Record<string, any>) => void} navigateMenuItem 菜单点击导航函数。
 * @returns {Array<Record<string, any>>} antd Menu items。
 */
const mapSidebarMenuModelToItems = (menuModel, navigateMenuItem) => {
  return menuModel.map((item) => {
    const antdItem = {
      key: item.key,
      icon: getIcon(item.iconName),
      label: renderMenuLabel(item.title, item.key),
    };

    if (Array.isArray(item.children) && item.children.length > 0) {
      return {
        ...antdItem,
        children: mapSidebarMenuModelToItems(item.children, navigateMenuItem),
      };
    }

    return {
      ...antdItem,
      onClick: () => navigateMenuItem(item),
    };
  });
};
/**
 * 左侧导航菜单组件。
 * @param {{ routes?: Array<Record<string, any>>, collapsed?: boolean }} props 组件参数。
 * @param {Array<Record<string, any>>} [props.routes=[]] 动态菜单路由树。
 * @param {boolean} [props.collapsed=false] 当前侧边栏是否折叠。
 * @returns {JSX.Element} 左侧菜单区域。
 */
const SidebarMenu = ({ routes = [], collapsed = false }) => {
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState([]);
  const menuWrapRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const menuModel = useMemo(() => buildSidebarMenuModel(routes), [routes]);
  const selectedKey = useMemo(() => {
    return resolveSidebarSelectedKey({
      pathname: location.pathname,
      routes,
    });
  }, [location.pathname, routes]);
  const selectedKeys = useMemo(() => (selectedKey ? [selectedKey] : []), [selectedKey]);

  /**
   * 处理菜单点击后的导航行为。
   * @param {Record<string, any>} menuItem 被点击的纯菜单模型节点。
   * @returns {void}
   */
  const navigateMenuItem = useCallback((menuItem) => {
    if (!menuItem?.targetPath) {
      return;
    }

    if (!menuItem.isExternal) {
      history.push(menuItem.targetPath);
      return;
    }

    if (typeof window !== 'undefined') {
      window.open(menuItem.targetPath);
    }
  }, []);
  const menuItems = useMemo(() => {
    return mapSidebarMenuModelToItems(menuModel, navigateMenuItem);
  }, [menuModel, navigateMenuItem]);

  useEffect(() => {
    setOpenKeys(buildSidebarOpenKeys(selectedKey));
  }, [selectedKey]);

  useEffect(() => {
    if (!menuWrapRef.current) {
      return undefined;
    }

    return attachDockMagnify(menuWrapRef.current, SIDEBAR_DOCK_MAGNIFY_OPTIONS);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, []);

  /**
   * 将刚展开的菜单块滚动到可视区内，避免 sticky logo 遮挡首个可视区域。
   * @param {*} menuKey 需要显露的菜单 key。
   * @param {ScrollBehavior} [behavior='smooth'] 滚动动画模式。
   * @returns {void}
   */
  const scrollToReveal = useCallback((menuKey, behavior = 'smooth') => {
    const wrap = menuWrapRef.current;
    if (!wrap || !menuKey) {
      return;
    }

    const scroller = wrap.closest('.framework-navigation') || wrap.parentElement;
    if (!scroller) {
      return;
    }

    const safeKey = String(menuKey).replace(/"/g, '\\"');
    const marker = wrap.querySelector(`[data-menu-key="${safeKey}"]`);
    const itemElement = marker?.closest('li.ant-menu-item, li.ant-menu-submenu');
    if (!itemElement) {
      return;
    }

    const header = scroller.querySelector('.logo');
    const headerRect = header?.getBoundingClientRect();
    const headerHeight = headerRect ? headerRect.height : 0;

    const scrollerRect = scroller.getBoundingClientRect();
    const visibleTop = scrollerRect.top + headerHeight + SIDEBAR_REVEAL_PADDING;
    const visibleBottom = scrollerRect.bottom - SIDEBAR_REVEAL_PADDING;

    const itemRect = itemElement.getBoundingClientRect();
    const subElement = itemElement.querySelector('ul.ant-menu-sub');
    const subRect = subElement?.getBoundingClientRect();

    const targetTop = Math.min(itemRect.top, subRect?.top ?? itemRect.top);
    const targetBottom = Math.max(itemRect.bottom, subRect?.bottom ?? itemRect.bottom);

    if (targetBottom > visibleBottom) {
      scroller.scrollTo({
        top: scroller.scrollTop + (targetBottom - visibleBottom),
        behavior,
      });
      return;
    }

    if (targetTop < visibleTop) {
      scroller.scrollTo({
        top: scroller.scrollTop + (targetTop - visibleTop),
        behavior,
      });
    }
  }, []);

  /**
   * 在 inline submenu 展开时做两次滚动校准，保证标题和展开区块都进入可视范围。
   * @param {*} menuKey 最新展开的菜单 key。
   * @returns {void}
   */
  const scheduleScrollToReveal = useCallback(
    (menuKey) => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }

      const raf =
        typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (callback) => setTimeout(callback, 0);
      raf(() => scrollToReveal(menuKey, 'auto'));

      scrollTimerRef.current = setTimeout(() => {
        scrollToReveal(menuKey, 'smooth');
      }, SIDEBAR_REVEAL_RECHECK_DELAY);
    },
    [scrollToReveal]
  );

  /**
   * 处理菜单展开/收起事件，维持手风琴模式并在新展开项出现时触发滚动显露。
   * @param {string[]} nextOpenKeys antd Menu 返回的展开 key 列表。
   * @returns {void}
   */
  const handleOpenChange = (nextOpenKeys) => {
    const { openKeys: nextAccordionKeys, latestOpenKey } = buildSidebarAccordionState({
      nextOpenKeys,
      previousOpenKeys: openKeys,
      collapsed,
    });

    setOpenKeys(nextAccordionKeys);
    if (latestOpenKey) {
      scheduleScrollToReveal(latestOpenKey);
    }
  };

  return (
    <div ref={menuWrapRef}>
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        items={menuItems}
        className="sidebar-menu"
        theme="light"
        inlineCollapsed={collapsed}
      />
    </div>
  );
};

export default SidebarMenu;
