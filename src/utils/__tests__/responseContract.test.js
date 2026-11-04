/**
 * `isSuccess`：按接入服务的显式合同判断业务结果；不预置 code/success 等字段规则。
 */
/**
 * 模块职责：验证通用成功 helper 必须由服务层明确提供成功判定，不猜任何默认业务 code。
 * 载荷仅为普通对象，HTTP/业务状态故意冲突；缺少 predicate 必须抛错以暴露接入缺口。
 */
import { isSuccess } from '../robust';

/**
 * 不同服务分别声明自己的成功字段，默认 code=200 不能覆盖实际业务失败。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('business success is decided by an explicit service contract instead of a default code', () => {
  // `result`：code=200 但 success=false 的冲突夹具，证明默认状态码不能冒充业务成功。
  const result = { code: 200, success: false };
  expect(
    isSuccess(
      result,
      (/* `response`：显式 success 契约接收的载荷，只认可严格 true，不隐式转换其它值。 */ response) =>
        response.success === true
    )
  ).toBe(false);
  expect(
    isSuccess(
      { accepted: true },
      (/* `response`：显式 accepted 契约接收的载荷，展示不同服务可以有不同成功字段。 */ response) =>
        response.accepted === true
    )
  ).toBe(true);
});

/**
 * 缺少显式成功判定器必须暴露 TypeError，禁止默认报告成功。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('missing success contract cannot silently report success', () => {
  expect(
    /**
     * 把未提供成功谓词的真实调用延迟交给 toThrow，验证外层 code=200 不会被猜成业务成功。
     * @returns {boolean} 若未抛错则由断言报告契约失效。
     */ () => isSuccess({ code: 200 })
  ).toThrow(TypeError);
});

// ───── 模块结束：src/utils/__tests__/responseContract.test.js ─────
