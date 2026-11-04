/**
 * 模块职责：分配后台页面的固定标题区和剩余内容高度，不拥有请求、表单或文档滚动。
 * 子组件应把长内容放入 ScrollPanel 或 ProTable；page-container-body 只能缩放，不用页面滚动补偿高度。
 */
// React 组合 title/extra/children，不再建立第二个内容状态 owner。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// 样式为标题和正文建立可收缩 flex 链，长内容滚动交给子组件。
import './index.less';

/**
 * 为页面提供一个确定高度的内容槽。
 * @param {Object} props title 为可选标题节点，extra 为右侧操作节点，children 为页面主要组件。
 * @returns {React.ReactElement} 标题不滚动的页面骨架；children 必须自行处理溢出。
 */
export default function PageContainer({
  /* `title`：页面固定标题节点，空值且无 extra 时省略整个标题区。 */ title,
  /* `extra`：固定标题区右侧操作节点，事件和忙碌状态由父级负责。 */ extra,
  /* `children`：占据标题之外剩余高度的主内容，应使用 ProTable/ScrollPanel 等内部滚动组件。 */ children,
}) {
  return (
    <section className="page-container">
      {(title || extra) && (
        <header className="page-container-header">
          <h1>{title}</h1>
          <div>{extra}</div>
        </header>
      )}
      <div className="page-container-body">{children}</div>
    </section>
  );
}

// ───── 模块结束：src/components/PageContainer/index.jsx ─────
