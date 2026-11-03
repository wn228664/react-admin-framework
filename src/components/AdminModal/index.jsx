import React from 'react';
import { Modal, Skeleton } from 'antd';
import useOverlayAction from '../AsyncOverlay/useOverlayAction';
import './index.less';

/** 受控弹窗。onOk(event, {signal}) 可异步；失败保留内容，关闭由调用方控制。 */
export default function AdminModal({
  open,
  onOk,
  onCancel,
  onError,
  loading = false,
  confirmLoading = false,
  cancelWhilePending = false,
  okButtonProps,
  cancelButtonProps,
  className = '',
  wrapClassName = '',
  children,
  styles,
  ...props
}) {
  const action = useOverlayAction(open, onOk, onError);
  const busy = action.pending || confirmLoading;
  const locked = busy && !cancelWhilePending;
  return (
    <Modal
      centered
      {...props}
      open={open}
      className={`admin-modal ${className}`}
      wrapClassName={`admin-modal-wrap ${wrapClassName}`}
      styles={styles}
      onOk={action.confirm}
      confirmLoading={busy}
      onCancel={(event) => {
        if (!locked) {
          action.cancel();
          onCancel?.(event);
        }
      }}
      okButtonProps={{ ...okButtonProps, disabled: loading || okButtonProps?.disabled }}
      cancelButtonProps={{ ...cancelButtonProps, disabled: locked || cancelButtonProps?.disabled }}
      closable={!locked && props.closable !== false}
      maskClosable={!locked && props.maskClosable !== false}
      keyboard={!locked && props.keyboard !== false}
    >
      {/* 使用 body 骨架而非 Modal.loading，后者会移除 footer，导致操作区消失。 */}
      {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : children}
    </Modal>
  );
}
