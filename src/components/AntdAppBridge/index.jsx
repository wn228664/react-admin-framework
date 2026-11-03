/**
 * @file src/components/AntdAppBridge/index.jsx
 * @description Ant Design `App` 上下文桥接组件。组件自身不渲染 UI，只负责在应用启动时把 `App.useApp()` 的 `message` / `modal` 实例绑定回历史静态调用入口。
 */
// `useLayoutEffect`：确保桥接发生在页面子组件的 `useEffect` 之前，避免登录页首屏请求仍然命中旧的静态 message。
import { useLayoutEffect } from 'react';
// `App`：读取 `App.useApp()` 提供的 message/modal 实例；这里只消费上下文，不直接渲染样式。
import { App } from 'antd';
// `bindAntdStaticApis`：把 `App` 上下文实例写回到历史静态 API；`restoreAntdStaticApis` 用于开发态清理。
import { bindAntdStaticApis, restoreAntdStaticApis } from '@/utils/antdStaticBridge';
/**
 * 根级桥接组件。
 * 主要职责：在根容器第一次挂载时完成 antd 静态 API 到上下文实例的桥接，让存量 `message.xxx()` / `Modal.xxx()` 调用自动进入 `App` 主题上下文。
 * @returns {null} 该组件只执行副作用，不输出可见 DOM。
 */
function AntdAppBridge() {
  // `message`：带主题上下文的 message 实例，桥接后历史调用将复用它。
  const { message, modal } = App.useApp();

  useLayoutEffect(() => {
    bindAntdStaticApis({
      messageApi: message,
      modalApi: modal,
    });

    return () => {
      restoreAntdStaticApis();
    };
  }, [message, modal]);

  return null;
}

export default AntdAppBridge;
