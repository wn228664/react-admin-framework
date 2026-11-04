/**
 * 模块职责：将当前路由树呈现为可展开侧栏，并保持选中项在菜单自己的滚动区域内可见。
 * 父级持有 routes/collapsed，组件只保存展开分支、定位引用和延迟显露计时器。
 * 菜单映射与动态路径匹配走纯 helper；指针动效、监听和计时器随组件释放，不参与业务授权。
 */
// openKeys 属于菜单局部状态，DOM/ref/计时器随 effect 释放；路由目录仍从父级快照派生。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 * `useCallback`：按依赖保持回调引用供消费者使用；回调中的当前值仍遵循 React 闭包语义。
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 * `useMemo`：按声明依赖派生配置/视图，不能作为永不丢失的业务状态或副作用所有者。
 * `useRef`：保存跨渲染 owner、DOM 或任务身份；写 current 不会触发重渲染，清理由配对生命周期负责。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// Antd Menu 提供可折叠层级结构，item key 来自完整路径。
/**
 * `Menu`：呈现层级导航，key 使用完整路径，选中和展开由本组件受控。
 */
import { Menu } from 'antd';
// 站内导航交给 history，location 驱动当前选中路径，不从菜单标题猜链接。
/**
 * `history`：通过站内 push/replace 执行显式导航；本模块决定目标，不能视为 URL 安全校验器。
 * `useLocation`：读取本次已确认导航的位置快照，pathname/search/hash 的具体消费由当前组件决定。
 */
import { history, useLocation } from 'umi';
// 图标名称只从真实 Ant Design 导出表解析，无效配置返回空图标。
/**
 * `Icons`：Ant Design 真实图标导出目录，只允许命中导出名后创建节点。
 */
import * as Icons from '@ant-design/icons';
// 指针动效仅改变 CSS 变量，返回的清理函数随菜单卸载调用。
/**
 * `attachDockMagnify`：在本容器按指针距离写缩放/抬升变量，返回配对清理监听、观察者和待执行帧的函数。
 */
import { attachDockMagnify } from '@/utils/dockMagnify';
// 路径、单子项折叠和手风琴规则与纯逻辑测试共用同一实现。
/**
 * `buildSidebarAccordionState`：处理手风琴模式下的菜单展开/收起状态。
 * `buildSidebarMenuModel`：递归构建供 SidebarMenu 组件渲染的纯菜单模型。
 * `buildSidebarOpenKeys`：根据当前高亮菜单 key 生成默认展开链。
 * `resolveSidebarSelectedKey`：解析当前 pathname 应该高亮的菜单 key。
 */
import {
  buildSidebarAccordionState,
  buildSidebarMenuModel,
  buildSidebarOpenKeys,
  resolveSidebarSelectedKey,
} from './utils';
// 菜单区域自行滚动，外层侧栏和页面保持有界高度。
import './index.less';
// 动效仅用于 mouse/pen，半径/抬升为 CSS 像素；触摸不依赖悬停才能导航。
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
// 展开动画结束后延迟复核可见区域，避免只测动画前坐标。
const SIDEBAR_REVEAL_RECHECK_DELAY = 260;
// 选中项显露时保留上下留白，单位 CSS 像素，不改变整个页面滚动。
const SIDEBAR_REVEAL_PADDING = 8;
/**
 * 动态获取图标组件。
 * @param {*} iconName 图标名称。
 * @returns {JSX.Element | null} 对应图标组件；缺失时返回 null。
 */
const getIcon = (iconName) => {
  // `safeIconName`：宿主提供的字符串名称，异常类型按空串；只接受真实且以风格后缀结尾的自有导出。
  const safeIconName = typeof iconName === 'string' ? iconName : '';
  if (!Object.hasOwn(Icons, safeIconName) || !/(Outlined|Filled|TwoTone)$/.test(safeIconName)) {
    return null;
  }

  // `IconComponent`：当前名称命中的 Antd 图标导出，缺失时不渲染占位。
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
  return menuModel.map(
    (/* `item`：当前纯菜单模型项，递归转为 Antd items；叶项点击统一调用 navigateMenuItem。 */ item) => {
      // `antdItem`：当前纯菜单项投影出的 Antd key/icon/label 基础配置，子树或点击另行派生。
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
        onClick: /**
         * 把叶菜单点击交给唯一导航入口，保留此模型项的完整目标路径与外链标记。
         * @returns {void}
         */ () => navigateMenuItem(item),
      };
    }
  );
};
/**
 * 左侧导航菜单组件。
 * @param {{ routes?: Array<Record<string, any>>, collapsed?: boolean }} props 组件参数。
 * @param {Array<Record<string, any>>} [props.routes=[]] 动态菜单路由树。
 * @param {boolean} [props.collapsed=false] 当前侧边栏是否折叠。
 * @returns {JSX.Element} 左侧菜单区域。
 */
const SidebarMenu = ({ routes = [], collapsed = false }) => {
  // `location`：Umi 当前页面位置，pathname 驱动选中项和祖先展开，不维护第二份路由。
  const location = useLocation();
  // 只保存当前展开分支；路由变化时根据 selectedKey 更新祖先 key。
  // `openKeys`：当前手风琴展开路径链，初始空数组；路径变化后显露选中项祖先，折叠时按共享规则清空。
  // `setOpenKeys`：发布当前手风琴展开链，路由变化和手动展开共用同一状态。
  const [openKeys, setOpenKeys] = useState([]);
  // 计时器和动效只操作当前菜单 DOM，离开时释放，不能查找其他页面的同名节点。
  const menuWrapRef = useRef(null);
  // `scrollTimerRef`：展开动画后复核的唯一 timeout 句柄；重排计划和卸载时先清理旧计时器。
  const scrollTimerRef = useRef(null);
  // 当前树的纯展示投影，权限过滤须由上游 routes owner 完成。
  const menuModel = useMemo(() => buildSidebarMenuModel(routes), [routes]);
  // `selectedKey`：由 pathname 和 meta.activeMenu 解析的唯一高亮项，空值表示无匹配。
  const selectedKey = useMemo(() => {
    return resolveSidebarSelectedKey({
      pathname: location.pathname,
      routes,
    });
  }, [location.pathname, routes]);
  // `selectedKeys`：把唯一高亮项适配为 Antd 所需数组，不以显示标题作为身份。
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
      window.open(menuItem.targetPath, '_blank', 'noopener,noreferrer');
    }
  }, []);
  // `menuItems`：纯菜单模型经统一导航入口映射的 Antd items，原树变化后重新派生。
  const menuItems = useMemo(() => {
    return mapSidebarMenuModelToItems(menuModel, navigateMenuItem);
  }, [menuModel, navigateMenuItem]);

  useEffect(
    /**
     * 选中路径变化后按纯规则重建祖先展开链，折叠与手风琴结构不依赖菜单标题。
     * @returns {void}
     */ () => {
      setOpenKeys(buildSidebarOpenKeys(selectedKey));
    },
    [selectedKey]
  );

  useEffect(
    /**
     * 仅为当前已挂载菜单绑定局部 Dock 效果，并把其清理函数交给 React；缺少 DOM 时不创建副作用。
     * @returns {Function|undefined}
     */ () => {
      if (!menuWrapRef.current) {
        return undefined;
      }

      return attachDockMagnify(menuWrapRef.current, SIDEBAR_DOCK_MAGNIFY_OPTIONS);
    },
    []
  );

  useEffect(
    /**
     * 为当前菜单 owner 注册延迟显露任务的卸载清理；路由显露仍由其它 effect 发起。
     * @returns {Function}
     */ () => {
      return (
        /**
         * 清除当前菜单尚未执行的显露 timeout 并释放句柄，防止卸载后读取旧菜单节点。
         * @returns {void}
         */ () => {
          if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = null;
          }
        }
      );
    },
    []
  );

  /**
   * 将刚展开的菜单块滚动到可视区内，避免 sticky logo 遮挡首个可视区域。
   * @param {*} menuKey 需要显露的菜单 key。
   * @param {ScrollBehavior} [behavior='smooth'] 滚动动画模式。
   * @returns {void}
   */
  const scrollToReveal = useCallback((menuKey, behavior = 'smooth') => {
    // `wrap`：本次显露操作读取的当前菜单根节点；卸载后 ref 为空便立即退出。
    const wrap = menuWrapRef.current;
    if (!wrap || !menuKey) {
      return;
    }

    // `scroller`：当前菜单专属 .framework-navigation 或父元素，不滚动 document/body。
    const scroller = wrap.closest('.framework-navigation') || wrap.parentElement;
    if (!scroller) {
      return;
    }

    // `safeKey`：将双引号转义后的菜单 key，供 data-menu-key 定位；来源是本地路由目录。
    const safeKey = String(menuKey).replace(/"/g, '\\"');
    // `marker`：当前菜单根内命中 data-menu-key 的标题标记，不能查找其它页面节点。
    const marker = wrap.querySelector(`[data-menu-key="${safeKey}"]`);
    // `itemElement`：标记所属的菜单项/子菜单 li，作为展开区块的边界起点。
    const itemElement = marker?.closest('li.ant-menu-item, li.ant-menu-submenu');
    if (!itemElement) {
      return;
    }

    // `header`：滚动容器中可选旧版 .logo 节点，存在时预留其高度，缺失不占空间。
    const header = scroller.querySelector('.logo');
    // `headerRect`：可选 Logo 相对视口的边框盒；只用于当前测量，不缓存跨帧坐标。
    const headerRect = header?.getBoundingClientRect();
    // `headerHeight`：当前 Logo 高度，单位 CSS px，缺失时 0。
    const headerHeight = headerRect ? headerRect.height : 0;

    // `scrollerRect`：菜单滚动容器相对视口的边框盒，和菜单项使用同一坐标系。
    const scrollerRect = scroller.getBoundingClientRect();
    // `visibleTop`：扣除可选 Logo 并增加 8px 留白后的可见顶部坐标。
    const visibleTop = scrollerRect.top + headerHeight + SIDEBAR_REVEAL_PADDING;
    // `visibleBottom`：菜单容器底部减 8px 留白后的可见底部坐标。
    const visibleBottom = scrollerRect.bottom - SIDEBAR_REVEAL_PADDING;

    // `itemRect`：当前菜单项相对视口的边框盒，含标题区。
    const itemRect = itemElement.getBoundingClientRect();
    // `subElement`：当前项内部的展开子菜单 ul，可选；缺失时仅显露标题。
    const subElement = itemElement.querySelector('ul.ant-menu-sub');
    // `subRect`：子菜单相对视口的可选边框盒，用于把整个展开块纳入目标边界。
    const subRect = subElement?.getBoundingClientRect();

    // `targetTop`：标题与子菜单较小的顶部坐标，必要时仅滚动菜单容器向上显露。
    const targetTop = Math.min(itemRect.top, subRect?.top ?? itemRect.top);
    // `targetBottom`：标题与子菜单较大的底部坐标，必要时优先向下显露展开内容。
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

      // `raf`：浏览器 requestAnimationFrame 或 0ms timeout 的调度入口；首帧显露重新读取当前 ref。
      const raf =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : (
              /* `callback`：没有 requestAnimationFrame 时交给 0ms timeout 的首轮显露函数；执行时仍检查当前 DOM ref。 */ callback
            ) => setTimeout(callback, 0);
      raf(
        /**
         * 在下一布局帧先按最新菜单盒显露选中项，使用 auto 避免叠加首轮滚动动画。
         * @returns {void}
         */ () => scrollToReveal(menuKey, 'auto')
      );

      scrollTimerRef.current = setTimeout(
        /**
         * 等待菜单展开动画稳定后再次显露目标项，防止首帧位置变化使选中项被内部滚动区裁掉。
         * @returns {void}
         */ () => {
          scrollToReveal(menuKey, 'smooth');
        },
        SIDEBAR_REVEAL_RECHECK_DELAY
      );
    },
    [scrollToReveal]
  );

  /**
   * 处理菜单展开/收起事件，维持手风琴模式并在新展开项出现时触发滚动显露。
   * @param {string[]} nextOpenKeys antd Menu 返回的展开 key 列表。
   * @returns {void}
   */
  const handleOpenChange = (nextOpenKeys) => {
    // `nextAccordionKeys`：共享手风琴规则给出的下一展开链，不直接使用未经规整的事件数组。
    // `latestOpenKey`：本次新打开的分支 key；存在时安排首帧与动画结束后的两次显露。
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

// ───── 模块结束：src/components/SidebarMenu/index.jsx ─────
