/**
 * 模块职责：编译真实图标选择器 LESS，防止预处理器把依赖视口的 CSS min/max 提前折叠为固定尺寸。
 * 只检查编译契约，实际浮层定位、焦点和滚动边界仍需浏览器验证。
 */
/** `readFile`：读取当前仓库样式源码，不使用复制的 CSS 夹具掩盖构建差异。 */
import { readFile } from 'node:fs/promises';
/** `path`：以测试文件位置解析真实组件样式，避免依赖测试进程的启动目录。 */
import path from 'node:path';
/** `less`：使用项目实际安装的 LESS 编译器，暴露原生 min/max 被预处理求值的问题。 */
import less from 'less';

/**
 * 面板宽度与列表高度必须保留浏览器原生 min/max，使不同视口重新计算组件尺寸。
 * @returns {Promise<void>} 编译或断言失败直接交给 Jest，不将原始 LESS 字面量冒充最终 CSS。
 */
test('compiled icon panel preserves viewport dependent min and max constraints', async () => {
  // `filename`：IconSelect 主样式绝对路径，同时提供给 LESS 解析相邻 token 引用。
  const filename = path.resolve(__dirname, '../index.less');
  // `source`：当前真实 LESS 文本；包含 reference token 导入，不在测试中手动展开依赖。
  const source = await readFile(filename, 'utf8');
  // `css`：真实预处理后的输出，断言约束仍包含 calc 和视口单位，避免宽度固定 500px 的回归。
  const { css } = await less.render(source, { filename });
  expect(css).toMatch(/width:\s*min\(31\.25rem, calc\(100vw - 4rem\)\)/);
  expect(css).toMatch(/max-height:\s*min\(18\.75rem, max\(4rem, calc\(100dvh - 12rem\)\)\)/);
});

// ───── 模块结束：src/components/IconSelect/__tests__/style.test.js ─────
