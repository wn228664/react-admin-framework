/**
 * 模块职责：提供用户触发的全屏切换，并监听浏览器真实状态保持按钮文案一致。
 * 按钮不提前假定进入成功；权限拒绝与平台异常通过 App 消息提示，状态由全屏 change 事件确认。
 * 事件监听随组件释放；全屏能力不代表移动设备、嵌入页或所有浏览器均允许调用。
 */
// React 状态只保存浏览器当前全屏状态，不保存一份乐观的按钮目标值。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import React, { useState } from 'react';
// ahooks 统一绑定标准/前缀全屏事件，卸载时解除 document 监听。
/**
 * `useEventListener`：按组件生命周期绑定/解除平台事件，避免 render 重复注册处理器。
 */
import { useEventListener } from 'ahooks';
// 主题化消息反馈平台拒绝，Tooltip/按钮提供显式操作和可访问名称。
/**
 * `App`：从当前根上下文取得主题化反馈能力，不把 message 当作任务成功判断。
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 * `Tooltip`：为当前图标或操作补充说明，关键操作仍需可访问名称。
 */
import { App, Button, Tooltip } from 'antd';
// 进入/退出图标始终跟随浏览器状态，不表示请求已经成功。
/**
 * `FullscreenExitOutlined`：退出全屏状态的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `FullscreenOutlined`：进入全屏入口的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
// 平台适配优先标准 API，兼容前缀并把同步/异步失败交还当前 UI。
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
} from './utils';
// 按钮的布局与悬停表现由本地样式统一管理。
import './index.less';
/**
 * 顶部全屏切换组件。
 * @returns {JSX.Element} 全屏切换按钮。
 */
const FullscreenToggle = () => {
  // 消息属于根 App 上下文；平台错误只展示通用说明，不输出原始浏览器对象。
  const { message } = App.useApp();
  /**
   * 向用户说明当前环境拒绝全屏切换；不改变浏览器状态或自动重试。
   * @returns {*} Antd 消息句柄，不由平台适配器等待。
   */
  const onError = () => message.warning('当前环境暂时无法切换全屏');
  // 初始状态从 document 读取，后续只按真实事件同步，失败时不会出现假退出按钮。
  // `isFullscreen`：当前 document 的真实全屏状态；初始化读取平台字段，后续仅由标准/前缀事件更新。
  // `setIsFullscreen`：从真实 document 全屏事件发布状态，平台请求失败时不做乐观切换。
  const [isFullscreen, setIsFullscreen] = useState(() => isFullscreenActive(globalThis.document));
  useEventListener(
    FULLSCREEN_CHANGE_EVENTS,
    /**
     * 平台全屏状态事件发生后重新读取实际 document 状态；不以点击成功或 Promise 返回值推断全屏已进入。
     * @returns {void}
     */ () => setIsFullscreen(isFullscreenActive(globalThis.document)),
    {
      target: /**
       * 延迟取得当前 document 作为事件目标，兼容模块导入时尚无浏览器对象的环境。
       * @returns {Document|undefined}
       */ () => globalThis.document,
    }
  );

  /**
   * 在用户点击时按当前真实状态选择进入/退出，保留浏览器手势要求。
   * @returns {void} 平台调用发起不等于完成，按钮状态等待 change 事件更新。
   */
  const toggleFullscreen = () => {
    if (typeof document === 'undefined') {
      return;
    }

    if (isFullscreen) {
      exitFullscreenFromDocument(document, onError);
      return;
    }

    requestFullscreenOnElement(document.documentElement, onError);
  };

  return (
    <Tooltip title={isFullscreen ? '退出全屏' : '全屏显示'}>
      <Button
        aria-label={isFullscreen ? '退出全屏' : '全屏显示'}
        type="text"
        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        onClick={toggleFullscreen}
        className="fullscreen-toggle"
      />
    </Tooltip>
  );
};

export default FullscreenToggle;

// ───── 模块结束：src/components/FullscreenToggle/index.jsx ─────
