/**
 * @file src/components/FullscreenToggle/index.jsx
 * @description 顶部全屏切换组件，负责监听浏览器全屏状态并在按钮点击时切换进入/退出全屏。
 * @example
 * <FullscreenToggle />
 */
import React, { useState } from 'react';
import { useEventListener } from 'ahooks';
import { Button, Tooltip } from 'antd';
import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
import {
  FULLSCREEN_CHANGE_EVENTS,
  exitFullscreenFromDocument,
  isFullscreenActive,
  requestFullscreenOnElement,
} from './utils';
import './index.less';
/**
 * 顶部全屏切换组件。
 * @returns {JSX.Element} 全屏切换按钮。
 */
const FullscreenToggle = () => {
  const [isFullscreen, setIsFullscreen] = useState(() => isFullscreenActive(globalThis.document));
  useEventListener(
    FULLSCREEN_CHANGE_EVENTS,
    () => setIsFullscreen(isFullscreenActive(globalThis.document)),
    { target: () => globalThis.document }
  );

  /**
   * 切换浏览器全屏状态，保持标准 API 优先、前缀 API 回退的既有兼容策略。
   * @returns {void}
   */
  const toggleFullscreen = () => {
    if (typeof document === 'undefined') {
      return;
    }

    if (isFullscreen) {
      exitFullscreenFromDocument(document);
      return;
    }

    requestFullscreenOnElement(document.documentElement);
  };

  return (
    <Tooltip title={isFullscreen ? '退出全屏' : '全屏显示'}>
      <Button
        type="text"
        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        onClick={toggleFullscreen}
        className="fullscreen-toggle"
      />
    </Tooltip>
  );
};

export default FullscreenToggle;
