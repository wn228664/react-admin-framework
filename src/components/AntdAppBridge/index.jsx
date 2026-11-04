/**
 * 模块职责：在根 App 挂载后把 message/Modal 静态入口接到主题上下文，组件自身不渲染 DOM。
 * layout effect 保证普通页面 effect 之前完成绑定；卸载时恢复原始方法，避免持有已销毁上下文。
 * 这里只桥接提示实例，不保存业务数据，也不判断业务结果。
 */
// layout effect 在普通页面 effect 之前发布消息实例，并在根边界卸载时清理。
/**
 * `useLayoutEffect`：在布局提交后、浏览器绘制前测量或绑定上下文；清理与挂载严格配对。
 */
import { useLayoutEffect } from 'react';
// App.useApp 读取已经由根 AntdApp 创建的主题化 message/modal owner。
/**
 * `App`：从当前根上下文取得主题化反馈能力，不把 message 当作任务成功判断。
 */
import { App } from 'antd';
// 绑定和恢复成对使用，避免开发热重载后静态对象继续指向旧上下文。
/**
 * `bindAntdStaticApis`：把 `App.useApp()` 返回的上下文实例桥接到 antd 静态 API。
 * `restoreAntdStaticApis`：恢复 antd 的原始静态实现。
 */
import { bindAntdStaticApis, restoreAntdStaticApis } from '@/utils/antdStaticBridge';
/**
 * 根级桥接组件。
 * 主要职责：在根容器第一次挂载时完成 antd 静态 API 到上下文实例的桥接，让存量 `message.xxx()` / `Modal.xxx()` 调用自动进入 `App` 主题上下文。
 * @returns {null} 该组件只执行副作用，不输出可见 DOM。
 */
function AntdAppBridge() {
  // `message`：带主题上下文的 message 实例，桥接后历史调用将复用它。
  // `modal`：当前根 App 的主题化弹窗实例；与 message 同批绑定，在根桥卸载后不继续供静态调用消费。
  const { message, modal } = App.useApp();

  useLayoutEffect(() => {
    bindAntdStaticApis({
      messageApi: message,
      modalApi: modal,
    });

    return (
      /**
       * 解绑本次 App 上下文提供的静态反馈入口，恢复原始函数，防止卸载后继续持有旧 message/modal 实例。
       * @returns {void}
       */ () => {
        restoreAntdStaticApis();
      }
    );
  }, [message, modal]);

  return null;
}

export default AntdAppBridge;

// ───── 模块结束：src/components/AntdAppBridge/index.jsx ─────
