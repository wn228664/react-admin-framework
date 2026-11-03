import React from 'react';
import { Button, Drawer, Skeleton, Space } from 'antd';
import useOverlayAction from '../AsyncOverlay/useOverlayAction';
import './index.less';

/** body 是唯一滚动区。默认 footer 提供确认/取消，footer=null 可关闭操作区。 */
export default function AdminDrawer({
  open,
  onOk,
  onClose,
  onError,
  loading = false,
  confirmLoading = false,
  cancelWhilePending = false,
  footer,
  className = '',
  rootClassName = '',
  children,
  okText = '确定',
  cancelText = '取消',
  ...props
}) {
  const action = useOverlayAction(open, onOk, onError);
  const busy = action.pending || confirmLoading;
  const locked = busy && !cancelWhilePending;
  const close = (event) => {
    if (!locked) {
      action.cancel();
      onClose?.(event);
    }
  };
  return (
    <Drawer
      {...props}
      open={open}
      className={className}
      rootClassName={`admin-drawer ${rootClassName}`}
      onClose={close}
      closable={!locked && props.closable !== false}
      maskClosable={!locked && props.maskClosable !== false}
      keyboard={!locked && props.keyboard !== false}
      footer={
        footer === undefined ? (
          <Space>
            <Button disabled={locked} onClick={close}>
              {cancelText}
            </Button>
            <Button type="primary" disabled={loading} loading={busy} onClick={action.confirm}>
              {okText}
            </Button>
          </Space>
        ) : (
          footer
        )
      }
    >
      {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : children}
    </Drawer>
  );
}
