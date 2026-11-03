import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import './index.less';

const Loading = ({ tip = '加载中...' }) => {
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
