/**
 * 模块职责：对实际表格 JSX/LESS 源码做少量滚动约束烟雾检查，防止明显删除横向滚动默认值。
 * 字符串/正则匹配只能提示结构退化，不能证明尺寸、可访问性和实际操作可达；浏览器检查单独保留。
 */
// `fs`：读取当前仓库的样式源码供静态约束检查；静态匹配不能证明实际布局可达。
const fs = require('fs');
// `path`：从测试文件所在目录解析实际源码路径，避免依赖测试进程启动目录。
const path = require('path');

// `componentSource`：按当前测试目录读取的真实 ProTable JSX 文本，用于默认 scroll.x 的静态约束。
const componentSource = fs.readFileSync(path.resolve(__dirname, '../index.jsx'), 'utf8');
// `styleSource`：真实 ProTable LESS 文本，检查正文 overflow 和滚动条声明，不能代替编译 CSS/运行布局。
const styleSource = fs.readFileSync(path.resolve(__dirname, '../index.less'), 'utf8');

describe('ProTable scroll style contract', /**
 * 登记表格横向默认与有界滚动样式的静态烟雾检查，实际滚动可达性由浏览器另外核验。
 * @returns {void}
 */ () => {
  /**
   * 静态烟雾检查保留 max-content 横向默认，实际滚动可达性仍以浏览器为准。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('defaults horizontal scroll to max-content when caller does not provide scroll.x', () => {
    expect(componentSource).toContain("externalScroll?.x !== undefined ? externalScroll.x : 'max-content'");
  });

  /**
   * 源码保留正文双向滚动和可见滚动条声明，防止显式删除基础布局约束。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('allows the table body to scroll in both directions', () => {
    expect(styleSource).toMatch(/\.ant-table-body\s*\{[\s\S]*overflow:\s*auto !important;/);
    expect(styleSource).toContain('scrollbar-gutter: stable');
    expect(styleSource).toMatch(/\.ant-table-body::-webkit-scrollbar\s*\{[\s\S]*height:\s*10px;/);
  });
});

// ───── 模块结束：src/components/ProTable/__tests__/styleContract.test.js ─────
