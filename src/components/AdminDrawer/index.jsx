/**
 * 模块职责：提供后台抽屉的受控可见性、异步确认与固定操作区，正文独立滚动。
 * 父级通过 open/onClose 持有生命周期，组件不复制表单或隐式关闭成功任务。
 * 关闭中止当前信号并隔离迟到结果；异步副作用是否已提交由接入服务负责确认。
 */
// React 渲染抽屉外壳与默认 footer，状态所有权仍在父组件。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// Drawer 提供焦点/遮罩，Skeleton 仅占正文，Button/Space 组织固定操作区。
/**
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 * `Drawer`：提供原生抽屉 portal、焦点与遮罩，本模块统一正文滚动和受控关闭。
 * `Skeleton`：仅占据加载中的正文，保留外层标题/footer 与关闭行为。
 * `Space`：组织当前节点间距，不能接管宿主子节点的点击或提交语义。
 */
import { Button, Drawer, Skeleton, Space } from 'antd';
// 与弹窗共享确认锁、错误反馈和取消代次，避免两套行为逐渐分叉。
/**
 * `useOverlayAction`：为一个受控 open 周期创建确认动作。
 */
import useOverlayAction from '../AsyncOverlay/useOverlayAction';
// 抽屉外框不滚动，body 是长内容的滚动 owner。
import './index.less';

/**
 * 创建带默认确认/取消 footer 的受控抽屉。
 * @param {Object} props 其余参数透传 Drawer，width/placement 等沿用 Antd 语义。
 * @param {boolean} props.open 当前可见状态；父级收到 onClose 后更新它。
 * @param {Function} [props.onOk] 接收 event、{signal}，失败保留抽屉与输入。
 * @param {Function} [props.onClose] 有效关闭通知；确认成功的关闭仍由父级控制。
 * @param {Function} [props.onError] 当前任务失败的展示接管函数，不能泄漏敏感错误正文。
 * @param {boolean} [props.loading=false] 正文骨架态，禁用默认确认入口。
 * @param {boolean} [props.confirmLoading=false] 外部额外忙碌态。
 * @param {boolean} [props.cancelWhilePending=false] 是否允许忙碌时关闭并中止信号。
 * @param {React.ReactNode|null} [props.footer] undefined 使用默认按钮，null 关闭底部，自定义节点自行管理按钮锁。
 * @param {string} [props.className] 内容类；rootClassName 用于附加 portal 外壳类。
 * @param {React.ReactNode} props.children 正文，数据和持久化归调用方。
 * @param {string} [props.okText=确定] 默认确认文案；cancelText 默认为取消。
 * @returns {React.ReactElement} 操作区固定、body 可收缩滚动的抽屉。
 */
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
  /* `rootClassName`：附加到 Drawer portal 根节点的类，默认空串；统一 admin-drawer 类始终保留。 */ rootClassName = '',
  children,
  okText = '确定',
  /* `cancelText`：默认取消按钮的公开文案，默认“取消”；自定义 footer 时由宿主自己决定展示。 */ cancelText = '取消',
  .../* `props`：剩余 Drawer 扩展配置；可见性、关闭入口、锁与 footer 由组件显式字段最后覆盖。 */ props
}) {
  // 一个实例拥有一个确认周期；外部 busy 只影响入口，不能替代内部防重复锁。
  const action = useOverlayAction(open, onOk, onError);
  // `busy`：内部确认 pending 或宿主 confirmLoading 任一为真即忙碌，驱动默认 footer 按钮与关闭许可。
  const busy = action.pending || confirmLoading;
  // cancelWhilePending 为显式取舍：关闭时先取消消费，再把控制权交还父级。
  const locked = busy && !cancelWhilePending;
  /**
   * 只在交互未锁定时取消当前确认，再通知父级关闭。
   * @param {Object} event Antd 的关闭事件，原样转交 onClose。
   * @returns {void} 不直接修改 open，也不撤销已完成的服务端副作用。
   */
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

// ───── 模块结束：src/components/AdminDrawer/index.jsx ─────
