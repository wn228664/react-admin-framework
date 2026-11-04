/**
 * 模块职责：把默认图片/视频预览放进统一后台弹窗，不额外复制文件或创建预览请求状态。
 * 父级持有 open/src/type，关闭只通知父级；传入地址必须先经过资源协议校验。
 * 正文媒体受可视高度约束，卸载预览节点后浏览器释放其展示资源。
 */
// React 只按父级 type 选择媒体节点，不根据远端正文执行脚本。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// 预览继承后台弹窗的 body 滚动和关闭行为，footer 明确关闭。
/**
 * `AdminModal`：提供受控可取消的确认弹窗，标题/footer 固定且正文内部滚动。
 */
import AdminModal from '../../AdminModal';

/**
 * 展示父级当前选择的媒体资源，不建立自己的文件或请求状态。
 * @param {Object} props 仅消费当前预览快照，资源地址须由上游完成协议校验。
 * @param {boolean} props.open 当前弹窗可见性，由父级持有。
 * @param {React.ReactNode} props.title 当前文件展示标题，不作为资源路径。
 * @param {"image"|"video"|string} props.type 媒体分类；其它值只保留空正文。
 * @param {string} props.src 安全媒体地址；浏览器负责实际解码，不能据此证明内容可信。
 * @param {Function} props.onCancel 请求父级关闭并清理资源引用的通知。
 * @returns {React.ReactElement} 无 footer 的有界弹窗；视频保留原生 controls，destroyOnHidden 释放媒体节点。
 */
const PreviewModal = ({ open, title, type, src, onCancel }) => {
  return (
    <AdminModal open={open} title={title} footer={null} onCancel={onCancel} width={800} centered destroyOnHidden>
      {type === 'image' ? (
        <img alt="preview" style={{ width: '100%', maxHeight: '65dvh', objectFit: 'contain' }} src={src} />
      ) : type === 'video' ? (
        <video controls style={{ width: '100%', maxHeight: '65dvh', objectFit: 'contain' }} src={src} autoPlay />
      ) : null}
    </AdminModal>
  );
};

export default PreviewModal;

// ───── 模块结束：src/components/UploadFile/components/PreviewModal.jsx ─────
