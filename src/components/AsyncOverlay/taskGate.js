/** 一个打开周期只允许一个确认动作；取消后使旧 promise 的结果失效。 */
export function createTaskGate() {
  let current;
  return {
    begin() {
      if (current) return null;
      const controller = new AbortController();
      current = controller;
      return {
        signal: controller.signal,
        isCurrent: () => current === controller && !controller.signal.aborted,
        finish() {
          if (current === controller) current = undefined;
        },
      };
    },
    cancel() {
      current?.abort();
      current = undefined;
    },
  };
}
