/**
 * @file src/components/Breadcrumb/index.jsx
 * @description 顶部面包屑导航组件，负责根据当前路由链生成仅用于提示的层级路径。
 * @example
 * <Breadcrumb routes={menu.routes} />
 */
import React from 'react';
import { Breadcrumb as AntBreadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useLocation } from 'umi';
import staticRoutes from '@/config/routes';
import { buildBreadcrumbEntries, BREADCRUMB_HOME_TITLE } from './utils';
import './index.less';
/**
 * 顶部面包屑导航组件。
 * @param {{ routes?: Array<Record<string, any>> }} props 组件参数。
 * @param {Array<Record<string, any>>} [props.routes=[]] 动态菜单路由树。
 * @returns {JSX.Element | null} 面包屑导航；首页或无匹配项时返回 null。
 */
const Breadcrumb = ({ routes = [] }) => {
  const location = useLocation();
  const breadcrumbEntries = buildBreadcrumbEntries({
    pathname: location.pathname,
    search: location.search,
    routes,
    staticRoutes,
  });

  if (breadcrumbEntries.length === 0) {
    return null;
  }
  const items = breadcrumbEntries.map((item) => {
    const titleNode = item.isHome ? (
      <span>
        <HomeOutlined style={{ marginRight: 4 }} />
        {BREADCRUMB_HOME_TITLE}
      </span>
    ) : (
      <span>{item.title}</span>
    );

    return {
      title: titleNode,
    };
  });

  return (
    <div className="breadcrumb-container">
      <AntBreadcrumb items={items} />
    </div>
  );
};

export default Breadcrumb;
