/**
 * 模块职责：展示上传选择入口的图标和文字，不承担选择、提交或取消动作。
 * loading 只是父级的进行中显示，实际 disabled、防重复和传输行为由外层 UploadFile/Antd Upload 管理。
 */
// React 根据父级 busy 与文案渲染轻量节点，没有独立计时或文件状态。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// 等待/加号图标只表示入口视觉，不能据此推断服务端是否接受文件。
/**
 * `LoadingOutlined`：等待状态的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `PlusOutlined`：新增文件入口的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';

/**
 * 为外层 Upload 提供纯展示的选择内容，不注册独立点击或传输处理器。
 * @param {Object} props 当前入口显示配置。
 * @param {boolean} props.loading 至少一个文件正在传输时显示等待图标；不是上传锁。
 * @param {React.ReactNode} props.placeholder 选择入口文案，实际 disabled/maxCount 由外层限制。
 * @returns {React.ReactElement} 图标与文本节点，生命周期跟随父级选择入口。
 */
const UploadButton = ({ loading, placeholder }) => {
  return (
    <div className="upload-button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>{placeholder}</div>
    </div>
  );
};

export default UploadButton;

// ───── 模块结束：src/components/UploadFile/components/UploadButton.jsx ─────
