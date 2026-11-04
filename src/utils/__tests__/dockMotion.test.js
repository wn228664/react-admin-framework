/**
 * 模块职责：验证系统减少动态效果时，Dock 不创建指针监听、元素测量或帧任务。
 * 使用受控 window 与最小容器替身，只覆盖注册边界；实际 CSS 与系统偏好切换仍由浏览器验收。
 */
/** `attachDockMagnify`：为菜单/标签创建局部指针动效并返回清理函数；本例检查偏好抑制分支。 */
import { attachDockMagnify } from '../dockMagnify';

/**
 * 系统偏好 reduce 时即使传入合法选择器也不访问容器内容，清理函数可重复调用。
 * @returns {void} 恢复测试前的 window，避免影响其它 Node 平台替身用例。
 */
test('reduced motion avoids binding or measuring dock items', () => {
  // `previousWindow`：测试开始时的全局 window 引用；finally 按原有存在性恢复，不能污染其它用例。
  const previousWindow = global.window;
  // `container`：仅暴露监听/查询入口的容器替身；reduce 分支不应调用任一个入口。
  const container = { addEventListener: jest.fn(), querySelectorAll: jest.fn() };
  try {
    global.window = {
      /**
       * 为本例固定返回系统减少动态效果状态，不执行真实设备媒体查询。
       * @returns {{matches: boolean}} matches=true 只用于触发 reduce 注册前退出分支。
       */
      matchMedia: () => ({ matches: true }),
    };
    // `cleanup`：reduce 分支返回的空清理入口，调用方仍可按同一生命周期契约释放两次。
    const cleanup = attachDockMagnify(container, { itemSelector: '.item' });
    cleanup();
    cleanup();
    expect(container.addEventListener).not.toHaveBeenCalled();
    expect(container.querySelectorAll).not.toHaveBeenCalled();
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});

// ───── 模块结束：src/utils/__tests__/dockMotion.test.js ─────
