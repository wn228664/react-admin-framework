/**
 * 模块职责：为静态确认/提示调用统一包裹后台弹窗的内部滚动布局。
 * 根 AntdAppBridge 必须先绑定上下文；这些函数返回 Antd 弹窗句柄，不负责服务端提交或页面表单状态。
 * 异步 onOk 的拒绝由 Antd 保持弹窗，调用方仍负责防重复、错误文本和请求取消。
 */
// 调用方正文通过 JSX 包进固定的滚动容器，静态弹窗也遵守后台正文高度边界。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// Modal 的静态方法由根桥接到 App 上下文，保持主题与语言一致。
/**
 * `Modal`：提供原生弹窗与静态句柄，滚动约束和异步错误消费按本模块契约接入。
 */
import { Modal } from 'antd';
// 复用受控弹窗的正文高度约束，长内容不能使文档根滚动。
import '../components/AdminModal/index.less';

/**
 * 按指定静态类型创建弹窗，并叠加统一 class 与中文操作文案。
 * @param {string} kind 仅由本模块固定 helper 提供的 Modal 方法名。
 * @param {Object} [options] Antd 配置；content 为调用方节点，异步回调原样透传。
 * @returns {Object} Antd 的 update/destroy 句柄；调用方离开时按需销毁。
 */
function open(kind, options = {}) {
  return Modal[kind]({
    ...options,
    className: `admin-modal ${options.className || ''}`,
    wrapClassName: `admin-modal-wrap ${options.wrapClassName || ''}`,
    content: <div className="admin-confirm-content">{options.content}</div>,
    okText: options.okText || '确定',
    cancelText: options.cancelText || '取消',
  });
}
/**
 * 打开需要用户确认的静态弹窗；options.onOk 可返回 Promise，返回 Antd 控制句柄。
 * @param {Object} [options] Antd confirm 配置；onOk 应自行处理防重、取消和业务错误。
 * @returns {Object} 含 update/destroy 的弹窗句柄，不表示用户已经确认。
 */
export const confirm = (options) => open('confirm', options);
/**
 * 打开信息弹窗；options.content 放进内部滚动区，返回 Antd 控制句柄。
 * @param {Object} [options] Antd info 配置，content 为可呈现的公开说明。
 * @returns {Object} 可更新、可销毁的弹窗句柄。
 */
export const info = (options) => open('info', options);
/**
 * 展示已经由调用方确认的成功结果；本 helper 不判断业务是否成功，返回弹窗句柄。
 * @param {Object} [options] Antd success 配置，服务结果应在调用之前验证。
 * @returns {Object} 可更新、可销毁的弹窗句柄。
 */
export const success = (options) => open('success', options);
/**
 * 展示调用方提供的警告；不会自动重试动作，返回可销毁的弹窗句柄。
 * @param {Object} [options] Antd warning 配置，操作回调由宿主提供。
 * @returns {Object} 可更新、可销毁的弹窗句柄。
 */
export const warning = (options) => open('warning', options);
/**
 * 展示已公开化的错误说明；不要将请求配置或敏感响应直接传入 content，返回弹窗句柄。
 * @param {Object} [options] Antd error 配置，避免直接序列化原始 Error/config。
 * @returns {Object} 可更新、可销毁的弹窗句柄。
 */
export const error = (options) => open('error', options);

// ───── 模块结束：src/utils/modal.js ─────
