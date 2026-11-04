/**
 * 模块职责：根据当前路由与菜单树展示只读面包屑，首页或无匹配层级时不占空间。
 * 动态菜单优先、静态路由兜底，标题只来自路由元数据，不根据业务路径或查询字段隐式改写。
 */
// React 只组织层级标题节点，不在面包屑中建立导航或业务状态。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// Antd Breadcrumb 提供层级语义与分隔展示，条目由本模块纯函数生成。
/**
 * `AntBreadcrumb`：显示本模块派生的只读层级条目，不附加隐式业务跳转。
 */
import { Breadcrumb as AntBreadcrumb } from 'antd';
// 首页图标只标记固定的框架首页条目。
/**
 * `HomeOutlined`：首页标识的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import { HomeOutlined } from '@ant-design/icons';
// location 提供导航后的 pathname 快照，面包屑据此重建层级而非保留上一页结果。
/**
 * `useLocation`：读取本次已确认导航的位置快照，pathname/search/hash 的具体消费由当前组件决定。
 */
import { useLocation } from 'umi';
// 静态中性路由在动态菜单未命中时兜底，避免入口初始化期间缺少标题。
/**
 * `staticRoutes`：完整静态路由配置的本地别名，动态菜单未命中时提供中性入口。
 */
import staticRoutes from '@/config/routes';
// 路径匹配和首页去重在共享 helper 中收口，避免与菜单各自定义规则。
/**
 * `buildBreadcrumbEntries`：按实际 pathname 生成标题链，动态菜单未命中时尝试静态路由。
 * `BREADCRUMB_HOME_TITLE`：补首页项的固定中文标题，不读取业务 query 或远端正文。
 */
import { buildBreadcrumbEntries, BREADCRUMB_HOME_TITLE } from './utils';
// 面包屑样式只约束标题展示，不拥有整个页面滚动。
import './index.less';
/**
 * 顶部面包屑导航组件。
 * @param {{ routes?: Array<Record<string, any>> }} props 组件参数。
 * @param {Array<Record<string, any>>} [props.routes=[]] 动态菜单路由树。
 * @returns {JSX.Element | null} 面包屑导航；首页或无匹配项时返回 null。
 */
const Breadcrumb = ({ routes = [] }) => {
  // `location`：当前 Umi 位置快照，路径变化后重新生成展示链，不缓存上一页面标题。
  const location = useLocation();
  // 每次根据当前路径生成展示链；不把上一页标题缓存到当前路由。
  const breadcrumbEntries = buildBreadcrumbEntries({
    pathname: location.pathname,
    search: location.search,
    routes,
    staticRoutes,
  });

  if (breadcrumbEntries.length === 0) {
    return null;
  }
  // Antd 条目只有 title 节点，不附加可能绕过受控导航的业务链接。
  const items = breadcrumbEntries.map(
    (/* `item`：当前已规整面包屑项，isHome 决定首页视觉；不包含隐式跳转行为。 */ item) => {
      // `titleNode`：当前条目的纯展示节点；首页附固定图标，其它仅显示路由提供的标题。
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
    }
  );

  return (
    <div className="breadcrumb-container">
      <AntBreadcrumb items={items} />
    </div>
  );
};

export default Breadcrumb;

// ───── 模块结束：src/components/Breadcrumb/index.jsx ─────
