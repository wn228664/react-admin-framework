/**
 * `ensureNumber`：数值兜底：把可能为 string/number/null/undefined 的输入收敛为可用 number。
 */
/**
 * 模块职责：验证展示文本类型、数字转换异常、大小写外部协议，以及偏好 Cookie 受限时的框架启动。
 * 所有数据与 Cookie 错误均为本地夹具；模型通过 isolateModules 重新加载，避免复用已缓存的正常初始化。
 * finally 恢复警告 spy 并撤销 Cookie 模块替换，测试不改真实会话或原业务项目。
 */
import { ensureNumber } from '../ensure';
/**
 * `isExternalPath`：判断 path 是否以受支持的外部协议开头，大小写不敏感；空值先转为空串。
 */
import { isExternalPath } from '../nav';
/**
 * `getMsg`：为提示组件选择文本错误说明，不把对象/数字作为 React 子节点输出。
 */
import { getMsg } from '../robust';

/**
 * 错误消息只接受有效文本，优先跳过对象/数字字段，避免 React 直接渲染异常。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('display messages select text fields instead of returning objects or numbers to React', () => {
  expect(getMsg({ msg: { detail: 'fixture' }, message: 'usable text' }, 'fallback')).toBe('usable text');
  expect(getMsg({ msg: 123 }, 'fallback')).toBe('fallback');
  // `error`：故意把 message 改为对象的 Error 夹具，getMsg 必须返回公开文本兜底而非交 React 渲染对象。
  const error = new Error('fixture');
  error.message = { detail: 'fixture' };
  expect(getMsg(error, 'fallback')).toBe('fallback');
});

/**
 * Symbol/抛错 valueOf 返回调用方兜底，同时保留既有布尔与逗号数值转换。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('display number conversion keeps a caller fallback when conversion itself throws', () => {
  expect(ensureNumber(Symbol('fixture'), 19)).toBe(19);
  expect(
    ensureNumber(
      {
        valueOf: /**
         * 模拟数值转换钩子拒绝访问，验证 ensureNumber 捕获转换异常并采用显式 fallback。
         * @throws {Error} 固定转换故障。
         */ () => {
          throw new Error('conversion denied');
        },
      },
      19
    )
  ).toBe(19);
  expect(ensureNumber(true, 19)).toBe(1);
  expect(ensureNumber('1,234.5', 19)).toBe(1234.5);
});

/**
 * HTTP(S)/mailto/tel 协议识别大小写无关，站内路径和空值仍保持非外链。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('external navigation schemes are case insensitive while local paths remain local', () => {
  // `path`：当前大小写外部协议夹具，HTTP(S)/mailto/tel 均应识别，站内路径另有明确反例。
  for (const path of ['HTTPS://example.test', 'HTTP://example.test', 'MAILTO:example@example.test', 'TEL:123'])
    expect(isExternalPath(path)).toBe(true);
  expect(isExternalPath('/components')).toBe(false);
  expect(isExternalPath(null)).toBe(false);
});

/**
 * Cookie 属性读写都被禁止时，真实布局模型仍可初始化并完成内存侧栏/尺寸更新。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('blocked preference cookies do not prevent layout initialization or in-memory navigation', () => {
  jest.isolateModules(
    /**
     * 隔离模块缓存后加载 app 模型，使 Cookie 故障替身在模块初始化时生效；断言内存设置仍可更新。
     * @returns {void}
     */ () => {
      jest.doMock(
        'js-cookie',
        /**
         * 提供读写都会失败的 Cookie 导出，专门覆盖初始化读取及后续持久化失败，不连接真实浏览器存储。
         * @returns {Object}
         */ () => ({
          get: /**
           * 模拟 Cookie 读取被浏览器策略阻止，模型初始化须使用默认值并继续可用。
           * @throws {Error} 固定读取失败。
           */ () => {
            throw new Error('Cookie access blocked');
          },
          set: /**
           * 模拟 Cookie 写入被策略阻止，reducer 须保留已更新内存状态，不把持久化失败冒充动作失败。
           * @throws {Error} 固定写入失败。
           */ () => {
            throw new Error('Cookie write blocked');
          },
        })
      );
      // `warning`：预期存储失败期间的 console.warn 静默观察器，finally 恢复，不能永久关闭诊断。
      const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        // `model`：Cookie getter/setter 都会抛错时重新加载的真实 app 模型，应仍能建立内存布局。
        const model = require('../../models/app').default;
        expect(model.state.sidebar.opened).toBe(true);
        expect(model.state.size).toBe('middle');
        // `toggled`：真实 toggleSidebar reducer 返回的新快照，继续用于验证 setSize 不依赖 Cookie 写入成功。
        const toggled = model.reducers.toggleSidebar(model.state);
        expect(toggled.sidebar.opened).toBe(false);
        expect(model.reducers.setSize(toggled, { payload: 'small' }).size).toBe('small');
        expect(model.reducers.closeSidebar(model.state, {}).sidebar.opened).toBe(false);
      } finally {
        warning.mockRestore();
        jest.dontMock('js-cookie');
      }
    }
  );
});

// ───── 模块结束：src/utils/__tests__/foundationBoundaries.test.js ─────
