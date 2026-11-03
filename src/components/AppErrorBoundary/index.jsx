/**
 * @file src/components/AppErrorBoundary/index.jsx
 * @description 全局错误边界：捕获渲染期异常并提供可恢复的兜底页面（刷新/返回首页），避免白屏。
 */
import React from 'react';
import { Button, Result, Space } from 'antd';
import { history } from 'umi';
import logger from '@/utils/logger';
import './index.less';

const isDev = process.env.NODE_ENV === 'development';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('AppErrorBoundary 捕获到渲染异常:', error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  reload = () => {
    window.location.reload();
  };

  goHome = () => {
    this.reset();
    history.replace('/dashboard');
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    if (!hasError) return this.props.children;

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
