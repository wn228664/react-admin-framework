/**
 * 模块职责：提供受控后台弹窗，保留 Antd 的焦点管理与 portal，只让正文区域滚动。
 * 父级持有 open 和表单草稿；本组件拥有确认互斥与取消信号，成功后是否关闭仍由父级决定。
 * 确认失败保留内容并显示公开错误，卸载/关闭使旧任务失效；loading 保留标题和底部操作。
 */
// React 承载受控弹窗 JSX，组件不另存一份 open 或草稿。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// Modal 提供原生 Antd 弹层行为，Skeleton 仅替换正文而保留 footer。
/**
 * `Modal`：提供原生弹窗与静态句柄，滚动约束和异步错误消费按本模块契约接入。
 * `Skeleton`：仅占据加载中的正文，保留外层标题/footer 与关闭行为。
 */
import { Modal, Skeleton } from 'antd';
// 确认动作使用统一生命周期门闩，避免连点、关闭重开与迟到错误互相干扰。
/**
 * `useOverlayAction`：为一个受控 open 周期创建确认动作。
 */
import useOverlayAction from '../AsyncOverlay/useOverlayAction';
// 正文高度和外层滚动边界在此样式统一约束。
import './index.less';

/**
 * 创建受控弹窗；父级必须响应 onCancel 并更新 open。
 * @param {Object} props 其余参数透传 Antd Modal，不能覆盖本组件的受控事件。
 * @param {boolean} props.open 当前可见状态，组件不会自行持久化。
 * @param {Function} [props.onOk] 接收 event、{signal}，可返回 Promise；外部写状态前检查 signal。
 * @param {Function} [props.onCancel] 有效取消后的关闭通知。
 * @param {Function} [props.onError] 接管当前确认失败；省略时显示 message.error。
 * @param {boolean} [props.loading=false] 显示正文骨架并禁用确认，区别于提交忙碌态。
 * @param {boolean} [props.confirmLoading=false] 接入方额外忙碌态，不代表已经占有内部动作锁。
 * @param {boolean} [props.cancelWhilePending=false] true 允许提交期间主动取消，服务端副作用不能撤销。
 * @param {Object} [props.okButtonProps] 确认按钮扩展配置，不能使 loading 正文可提交。
 * @param {Object} [props.cancelButtonProps] 取消按钮扩展配置，忙碌锁仍优先。
 * @param {string} [props.className] 弹窗附加类；wrapClassName 作用于 portal 外壳。
 * @param {React.ReactNode} props.children 父级持有的正文；footer=null 可明确隐藏底部。
 * @param {Object} [props.styles] Antd 样式扩展，集成方需保持正文可收缩和内部滚动。
 * @returns {React.ReactElement} 标题/footer 固定、body 滚动的 Antd 弹窗。
 */
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
  /* `wrapClassName`：Antd portal 外壳附加类名，默认空串；与统一 admin-modal-wrap 合并。 */ wrapClassName = '',
  children,
  styles,
  .../* `props`：剩余 Antd Modal 扩展配置；受控 open、动作回调、关闭许可和确认忙碌态由本组件最后覆盖。 */ props
}) {
  // 动作门闩只属于当前组件实例；pending 与外部 confirmLoading 合并后决定交互锁。
  const action = useOverlayAction(open, onOk, onError);
  // `busy`：内部确认 pending 与宿主 confirmLoading 合并的忙碌态；不以正文骨架 loading 代表已发送任务。
  const busy = action.pending || confirmLoading;
  // 默认禁止忙碌时遮罩、Esc 和关闭按钮误关；明确允许取消时才放开这些入口。
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
      onCancel={(/* `event`：Antd 发出的本次取消事件；未锁定时先撤销内部周期，再原样通知父级。 */ event) => {
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

// ───── 模块结束：src/components/AdminModal/index.jsx ─────
