/**
 * 模块职责：提供路由启动或全局等待的纯展示遮罩，不拥有异步任务或关闭计时器。
 * 父级决定挂载/卸载和 tip 内容；遮罩阻止与底下页面交互，任务失败时必须由父级换成可恢复状态。
 */
// React 只渲染父级给定的等待文案，不把 loading 当请求成功信号。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// Spin 提供加载状态展示，页面仍需独立处理失败和取消。
/**
 * `Spin`：展示等待视觉，不拥有请求、超时、取消或重试生命周期。
 */
import { Spin } from 'antd';
// 等待动画随父级挂载周期显示，任务结束后由父级释放整个遮罩，图标没有独立任务生命周期。
/**
 * `LoadingOutlined`：等待状态的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import { LoadingOutlined } from '@ant-design/icons';
// 固定遮罩与内容居中布局由组件样式承担。
import './index.less';

/**
 * 展示整个可视区的等待态；调用方负责停止等待并提供后续恢复入口。
 * @param {Object} props tip 为可选普通文本，默认加载中。
 * @returns {React.ReactElement} 不具备请求、重试或自动隐藏能力的遮罩。
 */
const Loading = ({
  /* `tip`：父级给定的当前等待说明，默认“加载中...”普通文本；任务失败后应由父级替换整个等待态。 */ tip = '加载中...',
}) => {
  // Spin 使用同一个图标尺寸，避免不同页面的等待提示布局跳动。
  // `antIcon`：固定 48px 的等待图标节点，交给 Spin 使用；没有独立计时器或任务完成语义。
  const antIcon = <LoadingOutlined style={{ fontSize: 48 }} spin />;

  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="logo-circle">
            <span className="logo-text">Framework</span>
          </div>
        </div>
        <Spin indicator={antIcon} />
        <div className="loading-tip">{tip}</div>
      </div>
    </div>
  );
};

export default Loading;

// ───── 模块结束：src/components/Loading/index.jsx ─────
