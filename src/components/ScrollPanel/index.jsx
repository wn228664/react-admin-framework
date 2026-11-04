/**
 * 模块职责：给长表单、上传和编辑区提供 Card 头部固定、body 自身滚动的容器。
 * 它只定义布局边界，不自动提交内容或监听文档滚动；父容器必须提供确定的可用高度。
 */
// React 透传 children 与 Card 属性，不复制内部表单状态。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// Card 负责头部和正文语义，组件样式明确分配二者的高度。
/**
 * `Card`：组织固定头部与可收缩正文；本地样式决定正文滚动 owner。
 */
import { Card } from 'antd';
// 仅 Card body 允许滚动，外壳保持 min-height:0，防止撑开页面。
import './index.less';

/**
 * 把普通 Card 属性与统一滚动类合并。
 * @param {Object} props children 为正文，className 追加外观，其余属性传给 Card。
 * @returns {React.ReactElement} 长内容在 body 内滚动；覆写 styles 时需保留该约束。
 */
export default function ScrollPanel({
  /* `children`：当前长表单/编辑器正文，滚动由 Card body 承担，不复制其状态。 */ children,
  /* `className`：宿主附加外观类，默认空串；与 scroll-panel 合并，不能移除内部滚动约束。 */ className = '',
  .../* `props`：剩余 Card 配置，如 title/extra；覆写 styles 时需保留可收缩 body 和确定父高度。 */ props
}) {
  return (
    <Card {...props} className={`scroll-panel ${className}`}>
      {children}
    </Card>
  );
}

// ───── 模块结束：src/components/ScrollPanel/index.jsx ─────
