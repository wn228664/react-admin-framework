/**
 * 模块职责：在后台内容区保存允许缓存的页面实例，并为每个实例保留自己的路由上下文快照。
 * 缓存身份由 pathname 与 tagsView.cachedViews 共同决定；非活动页隐藏而不是卸载，页面专用副作用需自行感知活动状态。
 * 不缓存的页面走当前 outlet；移除缓存名会释放对应实例，不能用 display:none 代替资源清理。
 */
// Context 读取父路由快照，state 持有缓存条目，memo 派生本次同步结果。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 * `useContext`：读取当前 Provider 的真实上下文快照，缓存页会明确替换自己的路由位置。
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 * `useMemo`：按声明依赖派生配置/视图，不能作为永不丢失的业务状态或副作用所有者。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import React, { useContext, useEffect, useMemo, useState } from 'react';
// 使用 React Router 上下文隔离缓存页；升级 router 时必须核对这些 UNSAFE API。
/**
 * `UNSAFE_LocationContext`：为每个缓存页提供独立位置快照；升级 router 必须检查此非稳定入口。
 * `UNSAFE_RouteContext`：隔离缓存页的父匹配链，避免继承其它活动页面；升级 router 需回归。
 */
import { UNSAFE_LocationContext, UNSAFE_RouteContext } from 'react-router-dom';
// Umi 提供实际路由树、当前匹配和 outlet，缓存实例仍通过 useRoutes 渲染。
/**
 * `useAppData`：读取 Umi 实际客户端路由目录，缓存渲染必须从布局下的内容路由匹配。
 * `useLocation`：读取本次已确认导航的位置快照，pathname/search/hash 的具体消费由当前组件决定。
 * `useOutlet`：取得当前路由真实出口，只有活动缓存实例已经承接时才隐藏它。
 * `useRoutes`：按提供的路由表与位置快照渲染页面树，不再次创建根布局。
 * `useSelectedRoutes`：取得当前匹配链，末项元数据用于标题和缓存策略。
 */
import { useAppData, useLocation, useOutlet, useRoutes, useSelectedRoutes } from 'umi';
// 纯函数规整 location、筛选缓存条目并比较稳定身份，避免循环 setState。
/**
 * `areKeepAliveEntriesEqual`：判断两组缓存条目是否完全一致，避免组件层在无变化时重复 setState。
 * `buildKeepAliveLocationSnapshot`：构建一份稳定的 location 快照，让缓存页在切走后仍然绑定自己的路由上下文。
 * `resolveLayoutOutletRoutes`：提取根布局下的内容子路由，避免缓存场景递归渲染 BasicLayout。
 * `resolveRouteKeepAliveConfig`：以标准 pathname 统一缓存身份，并读取当前匹配页 meta.noCache；不依赖显示名称。
 * `syncKeepAliveCacheEntries`：同步内容区缓存条目：保留仍在 cachedViews 中的历史页面，并仅在激活页未有条目时插入初始快照。
 */
import {
  areKeepAliveEntriesEqual,
  buildKeepAliveLocationSnapshot,
  resolveLayoutOutletRoutes,
  resolveRouteKeepAliveConfig,
  syncKeepAliveCacheEntries,
} from './utils';
// 只有活动页参与可见布局，缓存容器本身不放开文档滚动。
import './index.less';

// 缓存场景从根路由匹配自己的 location，避免重复继承当前页面的父匹配链。
// 每份缓存页从空父匹配链重新匹配，避免把当前活动页的父路由链叠加进去。
const CACHE_ROUTE_CONTEXT = { outlet: null, matches: [] };
/**
 * 渲染单个缓存页实例，并把该实例绑定到自己的 location 快照上。
 * @param {{
 *   isActive?: boolean,
 *   layoutRoutes?: Array<Record<string, any>>,
 *   locationSnapshot?: { pathname?: string, search?: string, hash?: string, state?: any, key?: string }
 * }} props 单个缓存页的渲染参数。
 * @returns {React.ReactElement | null} 单个缓存页容器。
 */
const KeepAliveRouteScene = ({ isActive = false, layoutRoutes = [], locationSnapshot }) => {
  // `renderedRoute`：useRoutes 按该实例固定 locationSnapshot 匹配的页面树，不继承其它活动页匹配链。
  const renderedRoute = useRoutes(layoutRoutes, locationSnapshot);

  return (
    <div className={`route-keep-alive-entry ${isActive ? 'active' : 'inactive'}`} aria-hidden={!isActive}>
      {renderedRoute}
    </div>
  );
};

/**
 * 在 BasicLayout 内容区按 tagsView.cachedViews 管理页面实例，为每个实例保留独立位置快照。
 * @param {{ cachedViews?: string[], children?: React.ReactNode }} props 缓存配置与兼容旧布局的兜底 children。
 * @returns {React.ReactElement} 内容区缓存出口。
 */
const RouteKeepAliveOutlet = ({ cachedViews, children }) => {
  // 继承根路由 Context 的其他字段，只替换缓存页自己的 location 快照。
  const locationContext = useContext(UNSAFE_LocationContext);
  // `location`：当前活动路由位置，仅活动配置派生消费；历史实例继续使用自己的首次快照。
  const location = useLocation();
  // `selectedRoutes`：当前 Umi 匹配链，末项元数据决定该页面是否允许缓存。
  const selectedRoutes = useSelectedRoutes();
  // `currentOutlet`：当前非缓存路由的真实出口；只有无活动缓存承接时显示。
  const currentOutlet = useOutlet();
  // `clientRoutes`：Umi 的实际客户端路由树，从中提取 Layout 下的内容区，避免递归 Layout。
  const { clientRoutes } = useAppData();
  // `layoutRoutes`：按 clientRoutes 派生的内容路由数组，各缓存实例在空父匹配上下文中匹配它。
  const layoutRoutes = useMemo(() => {
    return resolveLayoutOutletRoutes(clientRoutes);
  }, [clientRoutes]);
  // `activeConfig`：当前 pathname 对应的 cacheKey/routeName/shouldCache 三元配置。
  const activeConfig = useMemo(() => {
    return resolveRouteKeepAliveConfig({
      selectedRoutes,
      pathname: location.pathname,
    });
  }, [location.pathname, selectedRoutes]);
  // `locationSnapshot`：当前导航位置快照，新条目创建时使用；已有条目保留首次快照以防重挂载。
  const locationSnapshot = useMemo(() => {
    return buildKeepAliveLocationSnapshot(location);
  }, [location]);
  // 只保存仍被允许缓存的页面位置；不会把接口数据或凭证复制进缓存表。
  // `cacheEntries`：当前已提交的缓存实例位置表；首次按活动页初始化，非活动实例必须仍有 cachedViews 许可。
  // `setCacheEntries`：仅在身份/快照变化时提交新缓存表；移除条目后由 React 卸载对应实例。
  const [cacheEntries, setCacheEntries] = useState(() => {
    return syncKeepAliveCacheEntries({
      entries: [],
      activeConfig,
      locationSnapshot,
      cachedViews,
    });
  });
  // 当前 render 先使用同步派生结果，effect 再落到 state，避免切页时短暂显示错误实例。
  // `syncedCacheEntries`：当前 render 先同步派生的缓存表，避免等 effect 后短暂显示错误出口。
  const syncedCacheEntries = useMemo(() => {
    return syncKeepAliveCacheEntries({
      entries: cacheEntries,
      activeConfig,
      locationSnapshot,
      cachedViews,
    });
  }, [activeConfig, cacheEntries, cachedViews, locationSnapshot]);

  useEffect(
    /**
     * 路由位置、权限缓存资格或出口定义变化时从最新缓存表同步条目；使用函数式更新避免过期数组覆盖，不在渲染中写状态。
     * @returns {void}
     */ () => {
      setCacheEntries(
        (/* `previousEntries`：React 提供的最新缓存表，不使用 effect 闭包中的可能过期数组。 */ previousEntries) => {
          // `nextEntries`：当前 effect 从最新 state 重新同步的候选表；语义相同时沿用旧数组。
          const nextEntries = syncKeepAliveCacheEntries({
            entries: previousEntries,
            activeConfig,
            locationSnapshot,
            cachedViews,
          });

          return areKeepAliveEntriesEqual({ previousEntries, nextEntries }) ? previousEntries : nextEntries;
        }
      );
    },
    [activeConfig, cachedViews, locationSnapshot]
  );
  // `canRenderCachedEntries`：实际内容路由和有效缓存条目均非空时才创建缓存容器。
  const canRenderCachedEntries = layoutRoutes.length > 0 && syncedCacheEntries.length > 0;
  // 仅活动页确实由缓存实例承接时才隐藏 fallback，防止缓存缺失造成白屏。
  // `hasActiveCachedEntry`：当前页面确实允许缓存且表中已有对应身份的标记；否则保留真实 outlet 兜底。
  const hasActiveCachedEntry =
    canRenderCachedEntries &&
    activeConfig.shouldCache &&
    syncedCacheEntries.some(
      (/* `entry`：用于确认活动缓存是否存在的候选项，按 cacheKey 严格匹配。 */ entry) =>
        entry.cacheKey === activeConfig.cacheKey
    );

  return (
    <div className="route-keep-alive-outlet">
      {canRenderCachedEntries &&
        syncedCacheEntries.map((/* `entry`：本次渲染的缓存条目，拥有稳定 cacheKey 和独立位置快照。 */ entry) => {
          // `isActiveEntry`：当前遍历条目是否匹配活动 cacheKey，只控制显示/aria-hidden，不等于卸载非活动页。
          const isActiveEntry = entry.cacheKey === activeConfig.cacheKey;

          return (
            <UNSAFE_RouteContext.Provider key={entry.cacheKey} value={CACHE_ROUTE_CONTEXT}>
              <UNSAFE_LocationContext.Provider value={{ ...locationContext, location: entry.locationSnapshot }}>
                <KeepAliveRouteScene
                  isActive={isActiveEntry}
                  layoutRoutes={layoutRoutes}
                  locationSnapshot={entry.locationSnapshot}
                />
              </UNSAFE_LocationContext.Provider>
            </UNSAFE_RouteContext.Provider>
          );
        })}

      {!hasActiveCachedEntry && (
        <div className="route-keep-alive-fallback">
          {currentOutlet}
          {children}
        </div>
      )}
    </div>
  );
};

export default RouteKeepAliveOutlet;

// ───── 模块结束：src/components/RouteKeepAliveOutlet/index.jsx ─────
