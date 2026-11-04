/**
 * 模块职责：捕获页面子树的渲染异常，保留刷新与返回首页恢复入口，避免整个后台白屏。
 * 只覆盖 React 渲染/生命周期错误，不捕获普通异步事件的拒绝；服务调用方仍需处理自己的错误。
 * 生产界面不展示堆栈，日志仅投影字符串类型/代码，原错误和组件栈不送入通用日志。
 */
// React.Component 提供错误边界生命周期，函数组件不能直接替代这些钩子。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// Result 与按钮承载恢复操作，不把异常节点继续渲染进原子树。
/**
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 * `Result`：呈现错误/空态与恢复操作，不能用它吞掉原请求或渲染异常。
 * `Space`：组织当前节点间距，不能接管宿主子节点的点击或提交语义。
 */
import { Button, Result, Space } from 'antd';
// 返回首页使用 replace，避免浏览器后退再次进入同一错误入口。
/**
 * `history`：通过站内 push/replace 执行显式导航；本模块决定目标，不能视为 URL 安全校验器。
 */
import { history } from 'umi';
// 统一日志记录渲染故障；业务服务应先公开化错误内容。
/**
 * `logger`：提供统一诊断入口；warn/error 在生产仍可能输出，调用前必须移除秘密和原始响应。
 */
import logger from '@/utils/logger';
// 错误页拥有自身滚动区，长堆栈只在开发环境展示。
import './index.less';

// 仅开发构建向界面展示错误详情；生产保留恢复入口与通用说明。
const isDev = process.env.NODE_ENV === 'development';

/**
 * 根渲染恢复边界。实例状态只记录当前渲染故障，不存接口快照或认证数据。
 * children 恢复前不再渲染；用户通过重载或返回首页重新建立可用页面入口。
 */
class AppErrorBoundary extends React.Component {
  /**
   * 建立一次错误边界实例；props.children 为受保护子树，不在构造阶段读取网络或存储。
   * @param {Object} props React 传入的边界属性。
   */
  constructor(props) {
    super(props);
    // hasError 标记是否展示恢复页；error 保存当前原错误供开发详情使用；errorInfo 保存 React 组件栈，恢复时三项一起清空。
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  /**
   * 在 React 捕获渲染错误时切换至恢复界面；这里只返回状态，不产生副作用。
   * @param {Error} error 当前渲染失败对象。
   * @returns {Object} hasError/error 状态片段。
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * 在提交阶段记录公开错误类型/代码，并在实例中保留开发定位信息；不输出原始错误或组件栈。
   * @param {Error} error 已由 React 捕获的失败。
   * @param {Object} errorInfo React 生成的 componentStack，仅实例保存并在开发视图展示。
   * @returns {void}
   */
  componentDidCatch(error, errorInfo) {
    logger.error('页面渲染失败', {
      name: typeof error?.name === 'string' ? error.name : 'Error',
      code: typeof error?.code === 'string' ? error.code : undefined,
    });
    this.setState({ errorInfo });
  }

  /**
   * 撤销当前错误快照以便重新渲染；数据修复或导航由调用方恢复流程承担。
   * @returns {void}
   */
  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  /**
   * 用户显式选择后重载整个页面，重新建立路由和所有内存状态。
   * @returns {void}
   */
  reload = () => {
    window.location.reload();
  };

  /**
   * 先撤销错误态，再 replace 到固定框架首页，不追加失败路由的历史记录。
   * @returns {void}
   */
  goHome = () => {
    this.reset();
    history.replace('/dashboard');
  };

  /**
   * 正常时透明返回 children；失败时渲染组件内滚动的恢复面板。
   * @returns {React.ReactNode} 开发构建可展示堆栈，生产只展示通用错误说明。
   */
  render() {
    // `hasError`：实例是否已捕获子树渲染失败的标记；为 false 时透明返回 children。
    // `error`：实例保存的当前渲染错误，仅开发详情使用；生产界面和通用日志不输出正文。
    // `errorInfo`：实例保存的 React componentStack 快照，仅开发视图展示；恢复时清空。
    const { hasError, error, errorInfo } = this.state;
    if (!hasError) return this.props.children;

    // `detail`：开发构建拼接的错误/组件栈文本；生产严格为空串，React 文本节点不解释为 HTML。
    const detail = isDev
      ? `${error?.stack || error?.message || String(error)}\n\n${errorInfo?.componentStack || ''}`
      : '';

    return (
      <div className="app-error-boundary">
        <div>
          <Result
            status="error"
            title="页面异常"
            subTitle="渲染过程中发生错误，可尝试刷新页面或返回首页继续操作。"
            extra={
              <Space>
                <Button type="primary" onClick={this.reload}>
                  刷新页面
                </Button>
                <Button onClick={this.goHome}>返回首页</Button>
              </Space>
            }
          />
          {isDev && detail ? <pre className="app-error-boundary-detail">{detail}</pre> : null}
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;

// ───── 模块结束：src/components/AppErrorBoundary/index.jsx ─────
