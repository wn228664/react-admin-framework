/**
 * @file src/components/TagsView/index.jsx
 * @description 顶部标签页导航组件，负责把当前访问过的页面渲染为可切换标签，并提供刷新、关闭、关闭其他、关闭所有等操作。
 * @example
 * <TagsView />
 */

import React, { useEffect, useRef, useState } from 'react';
import { connect, history, useLocation } from 'umi';
import { Tag, Dropdown } from 'antd';
import { CloseOutlined, ReloadOutlined, CloseCircleOutlined } from '@ant-design/icons';
import routes from '@/config/routes';
import { ANIMATION_DELAY, SCROLL_MARGIN } from '@/constants/common';
import { attachDockMagnify } from '@/utils/dockMagnify';
import {
  buildTagsViewTag,
  buildUpdatedVisitedTags,
  canCloseTagsView,
  collectTagsViewAffixTags,
  findTagsViewRoute,
  isTagsViewActive,
  isTagsViewAffix,
  normalizeTagsViewHomePath,
  resolveTagsViewLastNavigation,
} from './utils';
import './index.less';
const DOCK_MAGNIFY_OPTIONS = {
  itemSelector: '.tags-view-item',
  axis: 'x',
  radius: 140,
  maxScale: 1.14,
  maxLift: 7,
  falloff: 2,
  activeClass: 'active',
  activeBoost: 0.14,
  pointerTypes: ['mouse', 'pen'],
};

/**
 * 页面顶部的访问标签条。
 * @param {Object} props - 组件属性。
 * @param {Function} props.dispatch - Dva dispatch，用于驱动 tagsView model 更新。
 * @param {Object} props.tagsView - 已访问标签与缓存标签状态。
 * @param {Object} props.menu - 当前菜单树，用于把路径映射回路由标题。
 * @returns {JSX.Element} 标签页导航条。
 */
const TagsView = ({ dispatch, tagsView, menu }) => {
  const location = useLocation();
  const scrollPaneRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const [affixTags, setAffixTags] = useState([]);

  /**
   * 清理挂起的滚动计时器，避免组件卸载或快速切页时执行过期滚动。
   * @returns {void}
   */
  const clearScrollTimer = () => {
    if (!scrollTimerRef.current) {
      return;
    }

    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = null;
  };

  /**
   * 让当前激活标签尽量滚动到容器中间。
   * 说明：这里保留延迟执行，是为了等 Tag DOM 和 Dock transform 都完成后再计算宽度。
   * @returns {void}
   */
  const scrollToActiveTag = () => {
    clearScrollTimer();

    scrollTimerRef.current = window.setTimeout(() => {
      if (!scrollPaneRef.current) {
        scrollTimerRef.current = null;
        return;
      }

      const container = scrollPaneRef.current;
      const activeTag = container.querySelector('.tags-view-item.active');
      if (!activeTag) {
        scrollTimerRef.current = null;
        return;
      }
      const containerWidth = container.offsetWidth;
      const containerScrollLeft = container.scrollLeft;
      const tagOffsetLeft = activeTag.offsetLeft;
      const tagWidth = activeTag.offsetWidth;
      const tagLeft = tagOffsetLeft - containerScrollLeft;
      const tagRight = tagLeft + tagWidth;
      const scrollToCenter = tagOffsetLeft - (containerWidth - tagWidth) / 2;

      if (tagLeft < SCROLL_MARGIN || tagRight > containerWidth - SCROLL_MARGIN) {
        container.scrollTo({
          left: Math.max(0, scrollToCenter),
          behavior: 'smooth',
        });
      }

      scrollTimerRef.current = null;
    }, ANIMATION_DELAY);
  };

  /**
   * 根据最新菜单树回填已存在标签的标题与 meta，避免菜单文案更新后旧标签仍显示旧标题。
   * @returns {void}
   */
  const refreshTagsTitles = () => {
    const { hasChanges, updatedViews } = buildUpdatedVisitedTags({
      visitedViews: tagsView.visitedViews,
      routeTree: menu.routes,
    });

    if (!hasChanges) {
      return;
    }

    dispatch({
      type: 'tagsView/batchUpdateViews',
      payload: updatedViews,
    });
  };

  /**
   * 初始化固定标签，并把这些 affix 标签同步写入 tagsView model。
   * @returns {void}
   */
  const initTags = () => {
    const tags = collectTagsViewAffixTags(menu.routes);
    setAffixTags(tags);

    tags.forEach((tag) => {
      if (!tag.name) {
        return;
      }

      dispatch({
        type: 'tagsView/addVisitedView',
        payload: tag,
      });
    });
  };

  /**
   * 根据当前 location 生成或刷新标签。
   * @returns {void}
   */
  const addTags = () => {
    const pathname = normalizeTagsViewHomePath(location.pathname);
    let currentRoute = findTagsViewRoute(menu.routes, pathname);
    if (!currentRoute && Array.isArray(routes) && routes.length > 0) {
      currentRoute = findTagsViewRoute(routes, pathname);
    }

    const nextTag = buildTagsViewTag({
      pathname,
      search: location.search,
      hash: location.hash,
      currentRoute,
    });

    dispatch({
      type: 'tagsView/addView',
      payload: nextTag,
    });
    dispatch({
      type: 'tagsView/updateVisitedView',
      payload: nextTag,
    });
  };

  useEffect(() => {
    initTags();
    refreshTagsTitles();
    addTags();
    return clearScrollTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    addTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    scrollToActiveTag();
    return clearScrollTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash, tagsView.visitedViews]);

  useEffect(() => {
    if (!scrollPaneRef.current) {
      return undefined;
    }

    return attachDockMagnify(scrollPaneRef.current, DOCK_MAGNIFY_OPTIONS);
  }, []);

  /**
   * 判断标签是否为当前激活标签。
   * @param {Object} tag - 当前标签对象。
   * @returns {boolean} 是否激活。
   */
  const isActive = (tag) => {
    return isTagsViewActive({
      currentPath: location.pathname,
      tagPath: tag.path,
    });
  };

  /**
   * 判断标签是否为固定标签。
   * @param {Object} tag - 当前标签对象。
   * @returns {boolean} 是否为 affix 标签。
   */
  const isAffix = (tag) => {
    return isTagsViewAffix(tag);
  };

  /**
   * 关闭选中的标签，并在关闭当前激活标签时自动跳到上一个可见视图。
   * @param {Object} tag - 被关闭的标签。
   * @returns {void}
   */
  const closeSelectedTag = (tag) => {
    if (!canCloseTagsView(tag)) {
      return;
    }

    dispatch({
      type: 'tagsView/delView',
      payload: tag,
    }).then(({ visitedViews }) => {
      if (isActive(tag)) {
        toLastView(visitedViews, tag);
      }
    });
  };

  /**
   * 刷新指定标签对应的页面。
   * @param {Object} tag - 需要刷新的标签。
   * @returns {void}
   */
  const refreshSelectedTag = (tag) => {
    dispatch({
      type: 'tagsView/delCachedView',
      payload: tag,
    });

    history.push('/redirect' + (tag.fullPath || tag.path));
  };

  /**
   * 保留当前标签、关闭其余标签。
   * @param {Object} tag - 需要保留的标签。
   * @returns {void}
   */
  const closeOthersTags = (tag) => {
    history.push(tag.fullPath || tag.path);
    dispatch({
      type: 'tagsView/delOthersViews',
      payload: tag,
    });
  };

  /**
   * 关闭所有标签，并在清空后根据 affix 标签回退到最后一个可见视图。
   * @param {Object} tag - 当前上下文中的标签。
   * @returns {void}
   */
  const closeAllTags = (tag) => {
    const currentPath = normalizeTagsViewHomePath(location.pathname);
    dispatch({
      type: 'tagsView/delAllViews',
    }).then(({ visitedViews }) => {
      if (affixTags.some((affixTag) => affixTag.path === currentPath)) {
        return;
      }

      toLastView(visitedViews, tag);
    });
  };

  /**
   * 关闭标签后回退到最近的一个可访问视图；若没有剩余标签，则回退到首页。
   * @param {Array} visitedViews - 删除动作后的剩余标签列表。
   * @param {Object} view - 当前触发关闭动作的标签。
   * @returns {void}
   */
  const toLastView = (visitedViews, view) => {
    const navigation = resolveTagsViewLastNavigation({
      visitedViews,
      view,
    });
    history[navigation.method](navigation.path);
  };

  /**
   * 生成单个标签的右键菜单项。
   * @param {Object} tag - 当前标签。
   * @returns {Array} antd Dropdown 所需的 items 配置。
   */
  const getContextMenuItems = (tag) => {
    const items = [
      {
        key: 'refresh',
        icon: <ReloadOutlined />,
        label: '刷新页面',
        onClick: () => refreshSelectedTag(tag),
      },
    ];

    if (!isAffix(tag)) {
      items.push({
        key: 'close',
        icon: <CloseOutlined />,
        label: '关闭页面',
        onClick: () => closeSelectedTag(tag),
      });
    }

    items.push(
      {
        key: 'closeOthers',
        icon: <CloseCircleOutlined />,
        label: '关闭其他',
        onClick: () => closeOthersTags(tag),
      },
      {
        key: 'closeAll',
        icon: <CloseCircleOutlined />,
        label: '关闭所有',
        onClick: () => closeAllTags(tag),
      }
    );

    return items;
  };

  return (
    <div className="tags-view-container">
      <div className="tags-view-wrapper" ref={scrollPaneRef}>
        {tagsView.visitedViews.map((tag) => (
          <Dropdown key={tag.path} menu={{ items: getContextMenuItems(tag) }} trigger={['contextMenu']}>
            <Tag
              className={`tags-view-item ${isActive(tag) ? 'active' : ''}`}
              closable={canCloseTagsView(tag)}
              onClose={(event) => {
                event.preventDefault();
                closeSelectedTag(tag);
              }}
              onClick={() => history.push(tag.fullPath || tag.path)}
            >
              <span className="tags-view-title" title={tag.title}>
                {tag.title}
              </span>
            </Tag>
          </Dropdown>
        ))}
      </div>
    </div>
  );
};

export default connect(({ tagsView, menu }) => ({
  tagsView,
  menu,
}))(TagsView);
