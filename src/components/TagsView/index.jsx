/**
 * 模块职责：呈现已访问页面标签，并把关闭、刷新与缓存名变化交给 tagsView model 和路由层。
 * 标签正文横向滚动，当前页显露只作用于标签容器；固定项不能通过普通关闭入口移除。
 * 延迟滚动和指针动效随卸载清理，页面缓存数据仍由 RouteKeepAliveOutlet 持有。
 */

// 局部 state 保存固定标签目录，ref 保存 DOM 与未完成滚动计时器。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 * `useRef`：保存跨渲染 owner、DOM 或任务身份；写 current 不会触发重渲染，清理由配对生命周期负责。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import React, { useEffect, useRef, useState } from 'react';
// 订阅唯一 Dva 标签/菜单快照，history/location 提供当前导航和恢复入口。
/**
 * `connect`：订阅唯一 Dva 模型并注入 dispatch，组件不另存模型字段的镜像。
 * `history`：通过站内 push/replace 执行显式导航；本模块决定目标，不能视为 URL 安全校验器。
 * `useLocation`：读取本次已确认导航的位置快照，pathname/search/hash 的具体消费由当前组件决定。
 */
import { connect, history, useLocation } from 'umi';
// Tag 呈现可关闭入口，Dropdown 提供批量关闭和刷新菜单。
/**
 * `Tag`：显示访问页签，默认关闭须先阻止，再交模型执行固定项保护。
 * `Dropdown`：呈现当前标签的上下文菜单，动作统一委托标签模型和路由入口。
 */
import { Tag, Dropdown } from 'antd';
// 图标只标识标签操作，关闭是否允许仍经过固定项规则。
/**
 * `CloseOutlined`：标签关闭动作的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `ReloadOutlined`：重置/刷新动作的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `CloseCircleOutlined`：批量关闭动作的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import { CloseOutlined, ReloadOutlined, CloseCircleOutlined } from '@ant-design/icons';
// 动态菜单未命中时按静态中性路由回填标题，不访问业务菜单接口。
/**
 * `routes`：完整中性静态路由配置，供路由装配或动态目录未命中时兜底。
 */
import routes from '@/config/routes';
// 延迟以毫秒计、显露边距以 CSS 像素计，避免指针动画期间坐标抖动。
/**
 * `ANIMATION_DELAY`：标签显露等待时间 200ms，只等待布局稳定，不作为请求重试。
 * `SCROLL_MARGIN`：标签在滚动容器内显露的左右留白 20 CSS px，不改变文档滚动。
 */
import { ANIMATION_DELAY, SCROLL_MARGIN } from '@/constants/common';
// 指针动效由独立 owner 注册/释放，不把 transform 当页面导航状态。
/**
 * `attachDockMagnify`：在本容器按指针距离写缩放/抬升变量，返回配对清理监听、观察者和待执行帧的函数。
 */
import { attachDockMagnify } from '@/utils/dockMagnify';
// 路径身份、固定项、标题和关闭回退均使用共享纯规则。
/**
 * `buildTagsViewTag`：根据 pathname/search/hash 和命中的路由配置生成下一次要写入 tagsView 的标签数据。
 * `buildUpdatedVisitedTags`：根据最新菜单树回填已访问标签的标题与 meta。
 * `canCloseTagsView`：仅允许非 affix 标签显示关闭入口，模型层仍需执行固定项保护。
 * `collectTagsViewAffixTags`：递归提取路由树中的 affix 标签。
 * `findTagsViewRoute`：递归查找指定路径对应的路由配置，兼容 `children/routes` 两种字段。
 * `isTagsViewActive`：判断标签是否与当前 pathname 处于同一页面。
 * `isTagsViewAffix`：判断标签是否为 affix 标签。
 * `normalizeTagsViewHomePath`：把根路径统一映射为首页标签路径，并移除末尾斜杠。
 * `resolveTagsViewLastNavigation`：解析关闭标签后的回退导航动作。
 * `TAGS_VIEW_REDIRECT_PREFIX`：框架保留的 /redirect 刷新中转前缀；不登记为普通菜单、访问项或缓存资格。
 */
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
  TAGS_VIEW_REDIRECT_PREFIX,
} from './utils';
// 标签条自身横向滚动，顶部外壳保持固定。
import './index.less';
// 选中标签的轻微基线抬升只影响视觉，允许指针离开后保留 active 提示。
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
  // `location`：Umi 当前导航快照，pathname 定位唯一标签，search/hash 保留在可恢复 fullPath 中。
  const location = useLocation();
  // 所有显露测量只在这个横向容器内执行，不调用 window.scrollTo。
  const scrollPaneRef = useRef(null);
  // 连续切页先取消旧计时器，再等待新标签布局稳定后显露。
  const scrollTimerRef = useRef(null);
  // 固定标签目录来自当前菜单元数据，实际 visitedViews/cachedViews 仍归 model。
  // `affixTags`：从当前菜单元数据提取的固定标签目录，默认空数组；只辅助恢复判断，真实访问列表仍由 model 持有。
  // `setAffixTags`：发布从当前菜单提取的固定标签目录，辅助关闭全部后的恢复判断，不替代 model 访问列表。
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

    scrollTimerRef.current = window.setTimeout(
      /**
       * 在标签布局稳定后读取当前标签与滚动容器边界，仅调整标签条 scrollLeft；不存在容器时释放计时器引用。
       * @returns {void}
       */ () => {
        if (!scrollPaneRef.current) {
          scrollTimerRef.current = null;
          return;
        }

        // `container`：延迟回调执行时的当前横向标签滚动容器，卸载后不保留旧 DOM 引用。
        const container = scrollPaneRef.current;
        // `activeTag`：当前容器中首个 active 标签，缺失时结束本次显露而不滚动文档。
        const activeTag = container.querySelector('.tags-view-item.active');
        if (!activeTag) {
          scrollTimerRef.current = null;
          return;
        }
        // `containerWidth`：标签容器可见宽度，单位 CSS px，用于判断目标是否超出左右留白。
        const containerWidth = container.offsetWidth;
        // `containerScrollLeft`：当前横向滚动偏移，单位 CSS px；与标签 offsetLeft 同属布局坐标。
        const containerScrollLeft = container.scrollLeft;
        // `tagOffsetLeft`：激活标签相对滚动内容起点的横向偏移，不使用 transform 后的视觉尺寸。
        const tagOffsetLeft = activeTag.offsetLeft;
        // `tagWidth`：激活标签的布局宽度，单位 CSS px，供居中位置计算。
        const tagWidth = activeTag.offsetWidth;
        // `tagLeft`：标签相对当前可视左边界的布局距离，负值或小于边距时需向左显露。
        const tagLeft = tagOffsetLeft - containerScrollLeft;
        // `tagRight`：标签相对当前可视左边界的右端位置，超过可见宽度减留白则需向右显露。
        const tagRight = tagLeft + tagWidth;
        // `scrollToCenter`：让标签在容器内居中的目标 scrollLeft，实际写入时至少 0，不改变页面滚动。
        const scrollToCenter = tagOffsetLeft - (containerWidth - tagWidth) / 2;

        if (tagLeft < SCROLL_MARGIN || tagRight > containerWidth - SCROLL_MARGIN) {
          container.scrollTo({
            left: Math.max(0, scrollToCenter),
            behavior: 'smooth',
          });
        }

        scrollTimerRef.current = null;
      },
      ANIMATION_DELAY
    );
  };

  /**
   * 根据最新菜单树回填已存在标签的标题与 meta，避免菜单文案更新后旧标签仍显示旧标题。
   * @returns {void}
   */
  const refreshTagsTitles = () => {
    // `hasChanges`：最新菜单是否改变任一已访问标签标题/affix/noCache；false 时不重复 dispatch。
    // `updatedViews`：最新菜单回填的访问投影数组，由 batchUpdateViews 合并到 model。
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
    // `tags`：从当前菜单树递归提取的固定标签目录，初始化时只发布有名称的项。
    const tags = collectTagsViewAffixTags(menu.routes);
    setAffixTags(tags);

    tags.forEach((/* `tag`：初始化固定目录的当前投影；无 name 不发布，避免存入不完整访问身份。 */ tag) => {
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
    // `pathname`：当前导航的统一标签身份；保留的 /redirect 中转前缀不登记访问项。
    const pathname = normalizeTagsViewHomePath(location.pathname);
    // 中转页只用于卸载旧实例，不生成“redirect/...”的访问项或缓存资格。
    if (pathname === TAGS_VIEW_REDIRECT_PREFIX || pathname.startsWith(`${TAGS_VIEW_REDIRECT_PREFIX}/`)) return;
    // `currentRoute`：动态菜单优先、静态路由兜底的当前声明，用于生成中性标题与缓存策略。
    let currentRoute = findTagsViewRoute(menu.routes, pathname);
    if (!currentRoute && Array.isArray(routes) && routes.length > 0) {
      currentRoute = findTagsViewRoute(routes, pathname);
    }

    // `nextTag`：当前 pathname/search/hash 与元数据生成的投影，顺序交 addView 和 updateVisitedView。
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

  useEffect(
    /**
     * 挂载时恢复固定标签、同步标题并登记当前页面；返回清理以撤销尚未执行的显露任务。
     * @returns {Function}
     */ () => {
      initTags();
      refreshTagsTitles();
      addTags();
      return clearScrollTimer;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(
    /**
     * pathname/search/hash 变化后登记实际访问页，刷新中转前缀由 addTags 排除，不产生幽灵页签。
     * @returns {void}
     */ () => {
      addTags();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname, location.search, location.hash]
  );

  useEffect(
    /**
     * 访问位置或标签集合变化后安排当前项在标签条内可见，并在依赖变化或卸载时清除旧显露计时器。
     * @returns {Function}
     */ () => {
      scrollToActiveTag();
      return clearScrollTimer;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname, location.search, location.hash, tagsView.visitedViews]
  );

  useEffect(
    /**
     * 为当前标签滚动容器绑定可释放的 Dock 动效；触摸与减少动态效果不能依赖悬停才能导航。
     * @returns {Function|undefined}
     */ () => {
      if (!scrollPaneRef.current) {
        return undefined;
      }

      return attachDockMagnify(scrollPaneRef.current, DOCK_MAGNIFY_OPTIONS);
    },
    []
  );

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
    }).then(
      ({ /* `visitedViews`：delView effect 返回的最新剩余列表；仅关闭的是当前活动页时选择回退。 */ visitedViews }) => {
        if (isActive(tag)) {
          toLastView(visitedViews, tag);
        }
      }
    );
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

    history.push(TAGS_VIEW_REDIRECT_PREFIX + (tag.fullPath || tag.path));
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
    // `currentPath`：“关闭所有”开始时的标准当前路径，判断它是否属于仍保留的固定项。
    const currentPath = normalizeTagsViewHomePath(location.pathname);
    dispatch({
      type: 'tagsView/delAllViews',
    }).then(
      ({ /* `visitedViews`：delAllViews effect 返回的最新剩余列表，固定项当前仍活动时无需跳转。 */ visitedViews }) => {
        if (
          affixTags.some(
            (/* `affixTag`：固定目录当前项；按标准 path 与关闭前的当前路径比较，保护现有恢复入口。 */ affixTag) =>
              affixTag.path === currentPath
          )
        ) {
          return;
        }

        toLastView(visitedViews, tag);
      }
    );
  };

  /**
   * 关闭标签后回退到最近的一个可访问视图；若没有剩余标签，则回退到首页。
   * @param {Array} visitedViews - 删除动作后的剩余标签列表。
   * @param {Object} view - 当前触发关闭动作的标签。
   * @returns {void}
   */
  const toLastView = (visitedViews, view) => {
    // `navigation`：共享回退规则给出的 push/replace 与路径二元描述，不自行猜测业务返回页。
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
    // `items`：当前标签的右键菜单配置，固定项省略单项关闭，批量操作仍交 model。
    const items = [
      {
        key: 'refresh',
        icon: <ReloadOutlined />,
        label: '刷新页面',
        onClick: /**
         * 刷新上下文菜单所属标签，缓存销毁和中转导航统一由 refreshSelectedTag 执行。
         * @returns {void}
         */ () => refreshSelectedTag(tag),
      },
    ];

    if (!isAffix(tag)) {
      items.push({
        key: 'close',
        icon: <CloseOutlined />,
        label: '关闭页面',
        onClick: /**
         * 关闭上下文菜单所属的非固定标签，活动项回退由共享标签规则决定。
         * @returns {void}
         */ () => closeSelectedTag(tag),
      });
    }

    items.push(
      {
        key: 'closeOthers',
        icon: <CloseCircleOutlined />,
        label: '关闭其他',
        onClick: /**
         * 保留当前上下文标签与固定标签，委托 closeOthersTags 同步访问目录和缓存资格。
         * @returns {void}
         */ () => closeOthersTags(tag),
      },
      {
        key: 'closeAll',
        icon: <CloseCircleOutlined />,
        label: '关闭所有',
        onClick: /**
         * 关闭允许关闭的全部标签并导航到保留页，不能通过菜单动作删除固定标签。
         * @returns {void}
         */ () => closeAllTags(tag),
      }
    );

    return items;
  };

  return (
    <div className="tags-view-container">
      <div className="tags-view-wrapper" ref={scrollPaneRef}>
        {tagsView.visitedViews.map(
          (/* `tag`：当前访问列表项，path 作为稳定 key，fullPath 用于点击恢复查询/hash。 */ tag) => (
            <Dropdown key={tag.path} menu={{ items: getContextMenuItems(tag) }} trigger={['contextMenu']}>
              <Tag
                className={`tags-view-item ${isActive(tag) ? 'active' : ''}`}
                closable={canCloseTagsView(tag)}
                onClose={(
                  /* `event`：Antd Tag 的关闭事件；先阻止控件默认移除，再由 model 决定是否允许关闭。 */ event
                ) => {
                  event.preventDefault();
                  closeSelectedTag(tag);
                }}
                onClick={
                  /**
                   * 打开此访问项保存的 fullPath，缺省时使用 path；保留普通查询与片段，不根据标题猜路由。
                   * @returns {void}
                   */ () => history.push(tag.fullPath || tag.path)
                }
              >
                <span className="tags-view-title" title={tag.title}>
                  {tag.title}
                </span>
              </Tag>
            </Dropdown>
          )
        )}
      </div>
    </div>
  );
};

export default connect(
  ({
    /* `tagsView`：connect 从全局根状态选出的唯一标签模型，避免组件复制访问/缓存列表。 */ tagsView,
    /* `menu`：connect 选出的当前菜单模型，用于标签标题、固定项和动态路由投影。 */ menu,
  }) => ({
    tagsView,
    menu,
  })
)(TagsView);

// ───── 模块结束：src/components/TagsView/index.jsx ─────
