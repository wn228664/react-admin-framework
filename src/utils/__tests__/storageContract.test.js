/**
 * `logger`：提供统一诊断入口；warn/error 在生产仍可能输出，调用前必须移除秘密和原始响应。
 */
/**
 * 模块职责：通过会抛错的 localStorage 属性 getter 验证标签存储边界覆盖“取得存储对象”阶段。
 * 不写实际用户存储；读取返回空状态，保存/删除失败不能阻止内存导航。
 * finally 恢复全局属性描述符与 logger spy，避免异常夹具污染后续用例。
 */
import logger from '../logger';
/**
 * `loadTagsViewStateFromStorage`：从 localStorage 读取 tagsView 状态，并把缓存结构规整为稳定数组。
 * `saveTagsViewStateToStorage`：把当前 tagsView 状态写回 localStorage。
 * `clearTagsViewStateFromStorage`：清理 localStorage 中的 tagsView 状态。
 */
import {
  loadTagsViewStateFromStorage,
  saveTagsViewStateToStorage,
  clearTagsViewStateFromStorage,
} from '@/models/tagsView.utils';

/**
 * localStorage 属性 getter 抛错也应被边界消费，标签读取/保存/删除不能阻断启动。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('blocked localStorage access does not prevent initial tag state or later in-memory operation', () => {
  // `descriptor`：测试前 localStorage 的完整属性描述符；恢复 getter/setter/configurable，而非仅恢复值。
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  // `log`：logger.error 的临时静默 spy，只隔离预期存储异常日志，finally 成对恢复原方法。
  const log = jest.spyOn(logger, 'error').mockImplementation(() => {});
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    /**
     * 在访问 localStorage 属性本身时抛错，覆盖浏览器策略阻止存储 getter 的真实边界。
     * @throws {Error} 固定权限失败。
     */ get() {
      throw new Error('storage blocked');
    },
  });
  try {
    expect(loadTagsViewStateFromStorage()).toEqual({ visitedViews: [], cachedViews: [] });
    expect(
      /**
       * 在受限存储下调用真实保存入口，断言本地持久化失败不会阻断内存标签操作。
       * @returns {void}
       */ () => saveTagsViewStateToStorage({ visitedViews: [], cachedViews: [] })
    ).not.toThrow();
    expect(
      /**
       * 在受限存储下调用真实清空入口，断言退出清理仍可继续，不能由存储异常中断。
       * @returns {void}
       */ () => clearTagsViewStateFromStorage()
    ).not.toThrow();
  } finally {
    log.mockRestore();
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

// ───── 模块结束：src/utils/__tests__/storageContract.test.js ─────
