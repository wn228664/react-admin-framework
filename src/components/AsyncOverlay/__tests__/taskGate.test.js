/**
 * `createTaskGate`：创建一个不共享全局状态的任务门闩，owner 卸载时必须 cancel。
 */
/**
 * 模块职责：直接测试每个浮层 owner 的同步确认门闩、关闭撤销和失败后重试。
 * 不挂载 UI 或发请求；signal/current/finish 联合保证连点和旧 finally 不能影响新任务。
 */
import { createTaskGate } from '../taskGate';

/**
 * 同一同步周期只允许一个确认句柄，完成释放后才能开始下一次。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('one action owns the open cycle, including synchronous duplicate clicks', () => {
  // `gate`：首个用例独有的门闩，验证同一同步周期最多一个动作，finish 后允许下一次。
  const gate = createTaskGate();
  // `action`：当前周期句柄，signal 未撤销，正常 finish 应释放其独占权。
  const action = gate.begin();
  expect(action.signal.aborted).toBe(false);
  expect(gate.begin()).toBeNull();
  action.finish();
  expect(gate.begin()).not.toBeNull();
});
/**
 * 关闭撤销旧 signal 并允许新周期，旧 finally 不得释放新锁。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('close aborts pending work and makes a late result stale', () => {
  // `gate`：关闭重开场景的独立门闩，不与前一用例共享 current。
  const gate = createTaskGate();
  // `old`：关闭前的旧周期句柄，cancel 后 signal 已撤销且不能继续作为 current。
  const old = gate.begin();
  gate.cancel();
  // `next`：重开后的新周期句柄，旧任务 finish 不得释放它。
  const next = gate.begin();
  expect(old.signal.aborted).toBe(true);
  expect(old.isCurrent()).toBe(false);
  old.finish();
  expect(next.isCurrent()).toBe(true);
  expect(gate.begin()).toBeNull();
});
/**
 * 失败消费后仍在 finally 释放当前句柄，下一次确认必须可重试。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('failure cleanup releases the action for retry', async () => {
  // `gate`：失败恢复场景的独立门闩，失败显示由调用方负责，这里只测试 finally 解锁。
  const gate = createTaskGate();
  // `action`：故意失败任务的句柄，finally 必须 finish，使用户可以再次确认。
  const action = gate.begin();
  try {
    await Promise.reject(new Error('failed'));
  } catch {
    /* 失败已由调用方消费，仍需在 finally 释放当前动作句柄。 */
  } finally {
    action.finish();
  }
  expect(gate.begin()).not.toBeNull();
});

// ───── 模块结束：src/components/AsyncOverlay/__tests__/taskGate.test.js ─────
