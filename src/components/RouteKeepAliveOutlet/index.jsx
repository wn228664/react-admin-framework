/**
 * @file src/components/RouteKeepAliveOutlet/index.jsx
 * @description BasicLayout 内容区的 keep-alive 容器，按 tagsView.cachedViews 真实缓存页面实例，并让每个缓存页保留自己的路由上下文快照。
 * @example
 * <RouteKeepAliveOutlet cachedViews={tagsView.cachedViews}>{children}</RouteKeepAliveOutlet>
 */
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { UNSAFE_LocationContext, UNSAFE_RouteContext } from 'react-router-dom';
import { useAppData, useLocation, useOutlet, useRoutes, useSelectedRoutes } from 'umi';
import {
  areKeepAliveEntriesEqual,
  buildKeepAliveLocationSnapshot,
  resolveLayoutOutletRoutes,
  resolveRouteKeepAliveConfig,
  syncKeepAliveCacheEntries,
} from './utils';
import './index.less';

// 缓存场景从根路由匹配自己的 location，避免重复继承当前页面的父匹配链。
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
  const renderedRoute = useRoutes(layoutRoutes, locationSnapshot);

  return (
    <div className={`route-keep-alive-entry ${isActive ? 'active' : 'inactive'}`} aria-hidden={!isActive}>
      {renderedRoute}
    </div>
  );
};

/**
 * 在 BasicLayout 内容区真实消费 tagsView.cachedViews，对齐 Vue `keep-alive :include="cachedViews"` 的页面缓存语义。
 * @param {{ cachedViews?: string[], children?: React.ReactNode }} props 缓存配置与兼容旧布局的兜底 children。
 * @returns {React.ReactElement} 内容区缓存出口。
 */
const RouteKeepAliveOutlet = ({ cachedViews, children }) => {
  const locationContext = useContext(UNSAFE_LocationContext);
  const location = useLocation();
  const selectedRoutes = useSelectedRoutes();
  const currentOutlet = useOutlet();
  const { clientRoutes } = useAppData();
  const layoutRoutes = useMemo(() => {
    return resolveLayoutOutletRoutes(clientRoutes);
  }, [clientRoutes]);
  const activeConfig = useMemo(() => {
    return resolveRouteKeepAliveConfig({
      selectedRoutes,
      pathname: location.pathname,
    });
  }, [location.pathname, selectedRoutes]);
  const locationSnapshot = useMemo(() => {
    return buildKeepAliveLocationSnapshot(location);
  }, [location]);
  const [cacheEntries, setCacheEntries] = useState(() => {
    return syncKeepAliveCacheEntries({
      entries: [],
      activeConfig,
      locationSnapshot,
      cachedViews,
    });
  });
  const syncedCacheEntries = useMemo(() => {
    return syncKeepAliveCacheEntries({
      entries: cacheEntries,
      activeConfig,
      locationSnapshot,
      cachedViews,
    });
  }, [activeConfig, cacheEntries, cachedViews, locationSnapshot]);

  useEffect(() => {
    setCacheEntries((previousEntries) => {
      const nextEntries = syncKeepAliveCacheEntries({
        entries: previousEntries,
        activeConfig,
        locationSnapshot,
        cachedViews,
      });

      return areKeepAliveEntriesEqual({ previousEntries, nextEntries }) ? previousEntries : nextEntries;
    });
  }, [activeConfig, cachedViews, locationSnapshot]);
  const canRenderCachedEntries = layoutRoutes.length > 0 && syncedCacheEntries.length > 0;
  const hasActiveCachedEntry =
    canRenderCachedEntries &&
    activeConfig.shouldCache &&
    syncedCacheEntries.some((entry) => entry.cacheKey === activeConfig.cacheKey);

  return (
    <div className="route-keep-alive-outlet">
      {canRenderCachedEntries &&
        syncedCacheEntries.map((entry) => {
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
