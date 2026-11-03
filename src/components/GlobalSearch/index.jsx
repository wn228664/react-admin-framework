/**
 * @file src/components/GlobalSearch/index.jsx
 * @description 顶部全局搜索组件，负责展示快捷入口、搜索弹窗和菜单跳转结果列表。
 * @example
 * <GlobalSearch routes={menu.routes} />
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, List, Tooltip } from 'antd';
import { RightOutlined, SearchOutlined } from '@ant-design/icons';
import { history } from 'umi';
import routeConfig from '@/config/routes';
import {
  filterGlobalSearchResults,
  flattenGlobalSearchRoutes,
  isGlobalSearchShortcut,
  resolveGlobalSearchRoutes,
} from './utils';
import AdminModal from '../AdminModal';
import './index.less';
const GLOBAL_SEARCH_MODAL_WIDTH = 600;
/**
 * 顶部全局搜索组件。
 * @param {{ routes?: Array<Record<string, any>> }} props 组件参数。
 * @param {Array<Record<string, any>>} [props.routes=[]] 布局层透传的动态菜单树。
 * @returns {JSX.Element} 全局搜索触发器与搜索弹窗。
 */
const GlobalSearch = ({ routes = [] }) => {
  const [visible, setVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const flattenedRoutes = useMemo(() => {
    const resolvedRoutes = resolveGlobalSearchRoutes(routes, routeConfig);
    return flattenGlobalSearchRoutes(resolvedRoutes);
  }, [routes]);

  useEffect(() => {
    const nextResults = filterGlobalSearchResults(flattenedRoutes, searchValue);
    setSearchResults(nextResults);
  }, [flattenedRoutes, searchValue]);

  /**
   * 打开搜索弹窗并清空上一次搜索输入。
   * @returns {void}
   */
  const openSearch = () => {
    setVisible(true);
    setSearchValue('');
    setSearchResults([]);
  };

  /**
   * 关闭搜索弹窗并重置搜索上下文。
   * @returns {void}
   */
  const closeSearch = () => {
    setVisible(false);
    setSearchValue('');
    setSearchResults([]);
  };

  /**
   * 选择搜索结果后跳转到目标菜单。
   * @param {{ path?: string, component?: string }} item 当前命中的菜单项。
   * @returns {void}
   */
  const selectResult = (item) => {
    const targetPath = item?.path;
    history.push(targetPath);
    closeSearch();
  };

  /**
   * 处理输入框内的回车与退出快捷键。
   * @param {React.KeyboardEvent<HTMLInputElement>} event 输入框键盘事件。
   * @returns {void}
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && searchResults.length > 0) {
      selectResult(searchResults[0]);
      return;
    }

    if (event.key === 'Escape') {
      closeSearch();
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    /**
     * 处理全局 `Ctrl/Cmd + K` 快捷键，保持任意页面都能拉起搜索弹窗。
     * @param {KeyboardEvent} event 全局键盘事件。
     * @returns {void}
     */
    const handleGlobalKeyDown = (event) => {
      if (!isGlobalSearchShortcut(event)) {
        return;
      }

      event.preventDefault();
      openSearch();
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  return (
    <>
      <Tooltip title="全局搜索 (Ctrl+K)">
        <Button type="text" icon={<SearchOutlined />} onClick={openSearch} className="global-search-trigger" />
      </Tooltip>

      <AdminModal
        title="全局搜索"
        open={visible}
        onCancel={closeSearch}
        footer={null}
        width={GLOBAL_SEARCH_MODAL_WIDTH}
        className="global-search-modal"
        destroyOnHidden
      >
        <div className="search-container">
          <Input
            placeholder="搜索菜单..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={handleKeyDown}
            prefix={<SearchOutlined />}
            size="large"
            autoFocus
            allowClear
          />

          <div className="search-results">
            {searchValue && (
              <>
                {searchResults.length > 0 ? (
                  <List
                    dataSource={searchResults}
                    renderItem={(item, index) => (
                      <List.Item
                        className={`search-result-item ${index === 0 ? 'active' : ''}`}
                        onClick={() => selectResult(item)}
                      >
                        <div className="result-content">
                          <div className="result-title">{item.title}</div>
                          <div className="result-path">{item.fullTitle}</div>
                        </div>
                        <RightOutlined className="result-arrow" />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="未找到相关菜单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </>
            )}

            {!searchValue && (
              <div className="search-tips">
                <p>💡 搜索提示：</p>
                <ul>
                  <li>当前可搜索 {flattenedRoutes.length} 个菜单项</li>
                  <li>输入菜单名称进行搜索</li>
                  <li>支持中文和拼音搜索</li>
                  <li>按 Enter 键快速跳转到第一个结果</li>
                  <li>按 Esc 键关闭搜索</li>
                  <li>使用 Ctrl+K 快速打开搜索</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </AdminModal>
    </>
  );
};

export default GlobalSearch;
