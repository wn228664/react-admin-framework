/**
 * 模块职责：用普通对象/Promise 替身覆盖全屏真实状态字段、标准/前缀优先级和错误分派。
 * 不调用宿主实际全屏权限，布尔返回只表示平台调用是否发起；异步拒绝不能成为未处理 Promise。
 */
/**
 * `FULLSCREEN_CHANGE_EVENTS`：标准和历史前缀全屏 change 事件名，只供同一实例绑定/解绑真实状态通知。
 * `exitFullscreenFromDocument`：向指定 document 发起退出，采用与进入相同的前缀兼容和失败通道。
 * `isFullscreenActive`：判断当前 document 是否处于全屏态，兼容历史浏览器前缀字段。
 * `requestFullscreenOnElement`：向指定元素发起全屏请求，按标准、WebKit、Mozilla、MS 顺序选择首个方法。
 */
import {
  FULLSCREEN_CHANGE_EVENTS,
  exitFullscreenFromDocument,
  isFullscreenActive,
  requestFullscreenOnElement,
} from '../utils';
describe('FullscreenToggle utils', /**
 * 登记全屏字段、前缀方法和同步/异步失败边界的规则用例；本套件不冒充真实浏览器全屏交互。
 * @returns {void}
 */ () => {
  /**
   * 标准与历史前缀事件/状态字段稳定，空 document 保守返回非全屏。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('should expose stable fullscreen change events and detect fullscreen state', () => {
    expect(FULLSCREEN_CHANGE_EVENTS).toEqual([
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ]);

    expect(isFullscreenActive({ fullscreenElement: {} })).toBe(true);
    expect(isFullscreenActive({ webkitFullscreenElement: {} })).toBe(true);
    expect(isFullscreenActive({ mozFullScreenElement: {} })).toBe(true);
    expect(isFullscreenActive({ msFullscreenElement: {} })).toBe(true);
    expect(isFullscreenActive({})).toBe(false);
    expect(isFullscreenActive(null)).toBe(false);
  });

  /**
   * 进入请求优先标准 API，按次序回退到可用前缀，缺能力时不虚报发起成功。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('should request fullscreen with standard api first and fallback to vendor-prefixed apis', () => {
    // `standardElement`：提供标准 requestFullscreen 的元素替身，标准方法应优先被调用一次。
    const standardElement = { requestFullscreen: jest.fn() };
    // `webkitElement`：仅有 WebKit 进入方法的替身，验证标准能力缺失后的兼容分支。
    const webkitElement = { webkitRequestFullscreen: jest.fn() };
    // `mozElement`：仅有 Mozilla 进入方法的替身，不依赖真实浏览器版本。
    const mozElement = { mozRequestFullScreen: jest.fn() };
    // `msElement`：仅有 MS 进入方法的替身，测试固定历史 API 契约而非宣称平台已支持。
    const msElement = { msRequestFullscreen: jest.fn() };

    expect(requestFullscreenOnElement(standardElement)).toBe(true);
    expect(standardElement.requestFullscreen).toHaveBeenCalledTimes(1);

    expect(requestFullscreenOnElement(webkitElement)).toBe(true);
    expect(webkitElement.webkitRequestFullscreen).toHaveBeenCalledTimes(1);

    expect(requestFullscreenOnElement(mozElement)).toBe(true);
    expect(mozElement.mozRequestFullScreen).toHaveBeenCalledTimes(1);

    expect(requestFullscreenOnElement(msElement)).toBe(true);
    expect(msElement.msRequestFullscreen).toHaveBeenCalledTimes(1);

    expect(requestFullscreenOnElement({})).toBe(false);
    expect(requestFullscreenOnElement(undefined)).toBe(false);
  });

  /**
   * 退出请求使用正确 document owner，标准优先并支持固定前缀兼容。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('should exit fullscreen with standard api first and fallback to vendor-prefixed apis', () => {
    // `standardDocument`：提供标准 exitFullscreen 的 document 替身，检查退出调用接收正确 owner。
    const standardDocument = { exitFullscreen: jest.fn() };
    // `webkitDocument`：仅有 WebKit 退出方法的 document 替身。
    const webkitDocument = { webkitExitFullscreen: jest.fn() };
    // `mozDocument`：仅有 Mozilla 退出方法的 document 替身。
    const mozDocument = { mozCancelFullScreen: jest.fn() };
    // `msDocument`：仅有 MS 退出方法的 document 替身。
    const msDocument = { msExitFullscreen: jest.fn() };

    expect(exitFullscreenFromDocument(standardDocument)).toBe(true);
    expect(standardDocument.exitFullscreen).toHaveBeenCalledTimes(1);

    expect(exitFullscreenFromDocument(webkitDocument)).toBe(true);
    expect(webkitDocument.webkitExitFullscreen).toHaveBeenCalledTimes(1);

    expect(exitFullscreenFromDocument(mozDocument)).toBe(true);
    expect(mozDocument.mozCancelFullScreen).toHaveBeenCalledTimes(1);

    expect(exitFullscreenFromDocument(msDocument)).toBe(true);
    expect(msDocument.msExitFullscreen).toHaveBeenCalledTimes(1);

    expect(exitFullscreenFromDocument({})).toBe(false);
    expect(exitFullscreenFromDocument(undefined)).toBe(false);
  });

  /**
   * 浏览器异步权限拒绝送达公开错误回调，适配器消费 Promise 拒绝。
   * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
   */
  it('reports asynchronous browser permission rejection without an unhandled promise', async () => {
    // `failure`：模拟浏览器异步权限拒绝的固定 Error，只用于检查 onError 收到同一原因。
    const failure = new Error('permission denied');
    // `rejected`：已经拒绝的权限 Promise，预先消费一次拒绝避免测试调度本身先产生未处理事件。
    const rejected = Promise.reject(failure);
    rejected.catch(
      /**
       * 提前消费夹具 Promise 的拒绝，防止 Node 把预设失败报告为未处理拒绝；真实 helper 仍须调用 onError。
       * @returns {void}
       */ () => {}
    );
    // `onError`：异步拒绝的错误观察者，等待一轮微任务后应收到原 failure。
    const onError = jest.fn();
    expect(
      requestFullscreenOnElement(
        {
          requestFullscreen: /**
           * 让平台请求入口返回已经拒绝的 Promise，验证封装会异步报告原 failure，同时区分调用发起与真正进入全屏。
           * @returns {Promise<never>}
           */ () => rejected,
        },
        onError
      )
    ).toBe(true);
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith(failure);
  });

  /**
   * 平台同步抛错被报告且返回 false，不能把抛错当作已发起操作。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('reports synchronous platform errors and does not pretend the operation started', () => {
    // `failure`：平台方法同步抛出的固定 Error，适配器应返回 false 而非声称已发起。
    const failure = new Error('unsupported document');
    // `onError`：同步平台失败的错误观察者，必须收到相同 failure。
    const onError = jest.fn();
    expect(
      exitFullscreenFromDocument(
        {
          /**
           * 模拟平台退出方法同步抛错，验证 helper 报告原 failure 并返回 false。
           * @throws {*} 本例固定 failure。
           */ exitFullscreen() {
            throw failure;
          },
        },
        onError
      )
    ).toBe(false);
    expect(onError).toHaveBeenCalledWith(failure);
  });
});

// ───── 模块结束：src/components/FullscreenToggle/__tests__/utils.test.js ─────
