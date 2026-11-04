/**
 * 模块职责：使用真实 Antd 和 React 服务端渲染，检查外部图标值不会实例化非图标导出。
 * 服务端不执行 DOM 焦点与弹层定位；键盘选择和窄屏滚动须由浏览器单独验证。
 */
/** `React`：为当前组件构造真实元素，不能用此渲染结果证明 effect 或用户事件已运行。 */
import React from 'react';
/** `renderToString`：真实组件在 Node 中的静态渲染入口；不执行 effect，名称命中非组件值时会暴露元素类型异常。 */
import { renderToString } from 'react-dom/server';
/** `IconSelect`：受控图标选择组件，只允许真实风格图标名称成为 JSX 节点。 */
import IconSelect from '../index';

/**
 * 为 Node 隔离 LESS 加载，不替换实际组件或图标导出；样式正确性由生产构建与浏览器检查。
 * @returns {Object} 空样式模块，不参与布局或图标解析。
 */
jest.mock('../index.less', () => ({}));

/**
 * default、工厂与原型名都不得成为当前图标，也不应使整张表单渲染失败。
 * @returns {void} 非法值以空触发框显示；合法名称仍显示原名称与图标。
 */
test('invalid icon values render an empty selection without instantiating exports', () => {
  // `value`：本轮外部受控值，包含非图标导出、继承名及异常类型；不作为动态模块路径。
  for (const value of ['default', 'constructor', 'createFromIconfontCN', null, {}]) {
    // `markup`：真实组件静态 HTML，非法值应形成空输入框且没有清空动作。
    const markup = renderToString(<IconSelect value={value} />);
    expect(markup).toContain('value=""');
    expect(markup).not.toContain('aria-label="清空图标"');
  }
  expect(renderToString(<IconSelect value="ApiOutlined" />)).toContain('value="ApiOutlined"');
});

// ───── 模块结束：src/components/IconSelect/__tests__/render.test.js ─────
