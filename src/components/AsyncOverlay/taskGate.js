/**
 * 模块职责：为弹窗、抽屉和搜索校验提供同步防重复与取消代次，不依赖 React。
 * 每个实例同一时刻只接受一个 begin；cancel 立即允许新周期，旧 finish 不能清除新锁。
 * AbortSignal 只通知调用方，不强制终止不响应信号的 Promise 或回滚远端副作用。
 */
/**
 * 创建一个不共享全局状态的任务门闩，owner 卸载时必须 cancel。
 * @returns {Object} begin/cancel；begin 重复进入返回 null，否则返回本周期 signal/isCurrent/finish。
 */
export function createTaskGate() {
  // 当前 AbortController 即周期身份；只有同一引用的完成才允许释放当前锁。
  let current;
  return {
    /**
     * 同步占有空闲门闩，先占锁再允许任何 await，防止同一帧连续进入。
     * @returns {Object|null} 有效周期句柄；正在运行时返回 null，不排队。
     */
    begin() {
      if (current) return null;
      // `controller`：本次 begin 独有的取消控制器；对象引用就是任务身份，finish 只能释放仍指向自己的 current。
      const controller = new AbortController();
      current = controller;
      return {
        // signal：交给当前确认函数的取消通知，取消不会回滚已经完成的远端动作。
        signal: controller.signal,
        /**
         * 核对当前句柄是否仍拥有门闩且尚未收到取消，供 await 后判断迟到结果是否可消费。
         * @returns {boolean} 取消、旧任务 finish 或新周期开始后均不能再以本句柄写入 UI。
         */
        isCurrent: () => current === controller && !controller.signal.aborted,
        /**
         * 本周期实际完成后释放锁；若已经取消或新周期开始则不影响新锁。
         * @returns {void}
         */
        finish() {
          if (current === controller) current = undefined;
        },
      };
    },
    /**
     * 发出取消信号并立即撤销周期身份，使迟到的结果/错误无权写回。
     * @returns {void} 可重复调用，不等待底层操作结束。
     */
    cancel() {
      current?.abort();
      current = undefined;
    },
  };
}

// ───── 模块结束：src/components/AsyncOverlay/taskGate.js ─────
