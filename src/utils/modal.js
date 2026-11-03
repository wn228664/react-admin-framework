import React from 'react';
import { Modal } from 'antd';
import '../components/AdminModal/index.less';

// 应用根的 AntdAppBridge 提供主题/语言上下文；挂载前不要调用静态 helper。
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
export const confirm = (options) => open('confirm', options);
export const info = (options) => open('info', options);
export const success = (options) => open('success', options);
export const warning = (options) => open('warning', options);
export const error = (options) => open('error', options);
