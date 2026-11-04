/**
 * 模块职责：验证渲染故障日志只保留公开类型/代码，原错误仍供开发恢复视图使用。
 * 不挂载 React DOM；setState 使用替身，避免把日志边界测试混成组件渲染测试。
 */
/**
 * `AppErrorBoundary`：隔离根子树渲染失败并提供恢复入口，不能捕获普通异步回调拒绝。
 */
import AppErrorBoundary from '../index';
/**
 * `logger`：提供统一诊断入口；warn/error 在生产仍可能输出，调用前必须移除秘密和原始响应。
 */
import logger from '@/utils/logger';

jest.mock(
  '@/utils/logger',
  /**
   * 捕获渲染边界的实际日志参数，禁止真实控制台输出，断言原错误/组件栈未被泄露。
   * @returns {Object}
   */ () => ({ error: jest.fn() })
);
jest.mock(
  '../index.less',
  /**
   * 为 Node 静态渲染隔离 LESS 加载，布局正确性由生产构建与浏览器验证。
   * @returns {Object} 空样式模块。
   */ () => ({})
);

/**
 * 渲染边界日志仅投影公开类型/代码，原错误和组件栈只留给实例开发恢复视图。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('render diagnostics do not serialize raw errors or component payloads', () => {
  // boundary：当前测试独有的错误边界实例，不连接页面或全局状态。
  const boundary = new AppErrorBoundary({ children: null });
  boundary.setState = jest.fn();
  // error：带敏感正文与请求字段的故障替身，只有 name/code 可以进入生产日志。
  const error = Object.assign(new Error('private-message-fixture'), {
    name: 'RenderError',
    code: 'RENDER_FAILED',
    config: { token: 'private-token-fixture' },
  });
  // errorInfo：React 提供的开发定位快照；保存在实例中，不能原样转发通用日志。
  const errorInfo = { componentStack: 'private-stack-fixture' };
  boundary.componentDidCatch(error, errorInfo);
  expect(logger.error).toHaveBeenCalledWith('页面渲染失败', { name: 'RenderError', code: 'RENDER_FAILED' });
  expect(JSON.stringify(logger.error.mock.calls)).not.toContain('private-');
  expect(boundary.setState).toHaveBeenCalledWith({ errorInfo });
});

// ───── 模块结束：src/components/AppErrorBoundary/__tests__/diagnostics.test.js ─────
