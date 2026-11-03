import React from 'react';
import { Card } from 'antd';
import './index.less';

/** 长表单、上传区、编辑区使用同一个边界：Card 头部固定，只有 body 可滚动。 */
export default function ScrollPanel({ children, className = '', ...props }) {
  return (
    <Card {...props} className={`scroll-panel ${className}`}>
      {children}
    </Card>
  );
}
