/**
 * `Cookies`：读写非敏感偏好或明确会话 Cookie；属性访问/读写异常由当前边界处理。
 */
/**
 * 模块职责：替换 js-cookie 后验证会话建立/撤销都会推进代次，包含相同 token 和存储失败。
 * 不访问浏览器 Cookie；观察公开返回值和 revision，避免存储异常使已发请求继续冒用旧身份。
 * Cookie mock 仅属于本测试模块，Jest 每例清理调用记录。
 */
import Cookies from 'js-cookie';
/**
 * `getSessionRevision`：读取当前页已发起的会话修改次数，供发请求时拍快照；读取本身不访问 Cookie。
 * `getToken`：读取当前会话值；浏览器禁止 Cookie 或 API 抛错时保持未认证态。
 * `setToken`：建立或替换当前会话；同值写入也视为新的身份周期。
 * `removeToken`：撤销此页对当前凭证的消费并尝试删除 Cookie；不会向服务端发送退出请求。
 */
import { getSessionRevision, getToken, setToken, removeToken } from '../auth';

jest.mock(
  'js-cookie',
  /**
   * 替换 Cookie 读写导出为可注入故障的观察器，验证实际凭证函数与会话代次，不访问浏览器 Cookie。
   * @returns {Object}
   */ () => ({ get: jest.fn(), set: jest.fn(), remove: jest.fn() })
);

/**
 * 两次相同 token 建立与一次删除分别增加代次，旧请求不能凭文本相同继续消费。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('same-token session establishment and removal each advance the session revision', () => {
  // `before`：连续两次同 token 建立和一次撤销前的代次，预期累计增加 3。
  const before = getSessionRevision();
  setToken('fixture');
  setToken('fixture');
  removeToken();
  expect(getSessionRevision()).toBe(before + 3);
});

/**
 * Cookie 写入失败仍推进代次且返回可观察失败，读取失败回到未认证态。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('storage failures are observable and also invalidate already-started requests', () => {
  // `before`：存储 set 抛错前的代次，失败仍需增加 1 以撤销旧异步消费。
  const before = getSessionRevision();
  Cookies.set.mockImplementationOnce(
    /**
     * 模拟 Cookie 写入受限并同步抛错，验证 setToken 返回失败且仍推进会话代次，旧请求不能继续消费。
     * @throws {Error} 固定存储拒绝。
     */ () => {
      throw new Error('storage unavailable');
    }
  );
  expect(setToken('fixture')).toBe(false);
  expect(getSessionRevision()).toBe(before + 1);
  Cookies.get.mockImplementationOnce(
    /**
     * 模拟 Cookie 读取受限，验证 getToken 保守返回未认证态，异常不逃逸至页面。
     * @throws {Error} 固定存储拒绝。
     */ () => {
      throw new Error('storage unavailable');
    }
  );
  expect(getToken()).toBeUndefined();
});

// ───── 模块结束：src/utils/__tests__/auth.test.js ─────
