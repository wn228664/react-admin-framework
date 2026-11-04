/**
 * `logger`：提供统一诊断入口；warn/error 在生产仍可能输出，调用前必须移除秘密和原始响应。
 */
/**
 * 模块职责：直接调用真实 Dva 错误配置，验证日志只投影公开字符串类型/代码。
 * 组件、样式和进度条被隔离以便在 Node 加载入口，未启动 UI 或真实模型 effect。
 * 故障对象故意含私密夹具标记；完整错误、headers 和响应正文均不得进入 logger 参数。
 */
import logger from '../logger';
/**
 * `dva`：真实应用导出的模型运行配置，测试直接调用 onError 检查日志字段，未启动 UI 或真实服务。
 */
import { dva } from '../../app';

jest.mock(
  '../logger',
  /**
   * 捕获 Dva 入口的错误日志参数，使测试验证实际公开投影而不会把故障夹具写入真实诊断。
   * @returns {Object}
   */ () => ({ error: jest.fn() })
);
jest.mock(
  '@/components/AppErrorBoundary',
  /**
   * 为只测试 Dva 日志的入口提供空错误边界组件，实际边界行为由其独立用例覆盖。
   * @returns {Function}
   */ () =>
    /**
     * 空错误边界占位不挂载恢复 UI，避免将渲染恢复行为混入入口日志投影断言。
     * @returns {null}
     */ () =>
      null
);
jest.mock(
  '@/components/AntdAppBridge',
  /**
   * 隔离 Antd App 桥挂载副作用，当前用例只加载真实入口的 Dva 配置。
   * @returns {Function}
   */ () =>
    /**
     * 空反馈桥占位不安装静态 message/modal，防止测试改写其它用例的全局反馈入口。
     * @returns {null}
     */ () =>
      null
);
jest.mock(
  'nprogress/nprogress.css',
  /**
   * 隔离 Node 无法加载的进度条 CSS，不替换进度条 JavaScript 接口。
   * @returns {Object}
   */ () => ({})
);
jest.mock(
  '@/styles/glass.less',
  /**
   * 隔离入口玻璃主题 LESS，当前日志用例不判断真实视觉样式。
   * @returns {Object}
   */ () => ({})
);
jest.mock(
  'nprogress',
  /**
   * 提供进度条观察器以安全加载入口，测试不触发导航或判断进度条实际绘制。
   * @returns {Object}
   */ () => ({ configure: jest.fn(), start: jest.fn(), done: jest.fn() })
);

/**
 * Dva 故障日志仅保留公开字符串类型和代码，原 message/凭证/响应正文不得被序列化。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('the model error boundary logs only public type and code, excluding request data and messages', () => {
  // `error`：带 message、Authorization 和响应正文的 Axios 形状夹具；只允许 name/code 投影进入日志。
  const error = Object.assign(new Error('private-message-fixture'), {
    name: 'AxiosError',
    code: 'ERR_NETWORK',
    config: { headers: { Authorization: 'private-token-fixture' } },
    response: { data: 'private-response-fixture' },
  });
  dva.config.onError(error);
  expect(logger.error).toHaveBeenCalledWith('模型执行失败', { name: 'AxiosError', code: 'ERR_NETWORK' });
  expect(JSON.stringify(logger.error.mock.calls)).not.toContain('private-');
});

/**
 * name/code 为任意对象时使用安全默认或省略，避免诊断投影再次泄露对象正文。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('non-text diagnostic properties are not serialized as arbitrary objects', () => {
  dva.config.onError({ name: { private: 'fixture' }, code: { private: 'fixture' } });
  expect(logger.error).toHaveBeenLastCalledWith('模型执行失败', { name: 'Error', code: undefined });
});

// ───── 模块结束：src/utils/__tests__/entryDiagnostics.test.js ─────
