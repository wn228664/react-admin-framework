/**
 * 模块职责：把当前菜单树转换为本地可搜索入口，支持文本、拼音与快捷键导航。
 * 不搜索远程业务数据或泄漏未提供的菜单；路由权限仍由接入层和服务端执行。
 * 弹窗打开/关闭清理搜索草稿，全局快捷键由组件生命周期注册和释放。
 */
// 状态保存本次搜索草稿与结果，memo 只在路由树变化时重建可搜索条目。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 * `useMemo`：按声明依赖派生配置/视图，不能作为永不丢失的业务状态或副作用所有者。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import React, { useEffect, useMemo, useState } from 'react';
// Ctrl/Cmd+K 的 document 监听由 ahooks 维护，避免 render 时累积处理器。
/**
 * `useEventListener`：按组件生命周期绑定/解除平台事件，避免 render 重复注册处理器。
 */
import { useEventListener } from 'ahooks';
// Input/List 呈现本地结果，Empty 表达无匹配，Tooltip 标记快捷键。
/**
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 * `Empty`：表达当前本地结果或数据为空，与请求失败状态分开显示。
 * `Input`：显示受控文本草稿，值更新和提交是两个独立动作。
 * `List`：按当前结果数组渲染条目，数据查询与选择动作仍归本组件。
 * `Tooltip`：为当前图标或操作补充说明，关键操作仍需可访问名称。
 */
import { Button, Empty, Input, List, Tooltip } from 'antd';
// 搜索和前进图标只是操作提示，不参与路径匹配或权限判断。
/**
 * `RightOutlined`：搜索结果前进提示的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `SearchOutlined`：搜索入口的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import { RightOutlined, SearchOutlined } from '@ant-design/icons';
// 命中结果使用站内 history 跳转，选择后撤销当前搜索上下文。
/**
 * `history`：通过站内 push/replace 执行显式导航；本模块决定目标，不能视为 URL 安全校验器。
 */
import { history } from 'umi';
// 动态菜单为空时使用静态框架入口兜底，不请求业务菜单服务。
/**
 * `routeConfig`：完整静态路由配置的本地别名，动态搜索目录为空时取根布局子树。
 */
import routeConfig from '@/config/routes';
// 纯 helper 统一过滤可搜索菜单、匹配优先级与快捷键范围。
/**
 * `filterGlobalSearchResults`：按关键字过滤可搜索菜单项，并保持现有最多展示 10 条结果的口径。
 * `flattenGlobalSearchRoutes`：扁平化路由树，提取所有带 `meta.title` 与 `path` 的可搜索菜单项。
 * `isGlobalSearchShortcut`：判断是否允许由菜单搜索接管 Ctrl/Cmd+K。
 * `resolveGlobalSearchKeyAction`：将搜索输入框的有效 Enter/Escape 投影为界面动作，供组件与回归测试共用。
 * `resolveGlobalSearchRoutes`：从动态路由与静态路由配置中解析 GlobalSearch 应该使用的路由树。
 */
import {
  filterGlobalSearchResults,
  flattenGlobalSearchRoutes,
  isGlobalSearchShortcut,
  resolveGlobalSearchKeyAction,
  resolveGlobalSearchRoutes,
} from './utils';
// 搜索弹层复用后台正文滚动约束和受控关闭契约。
/**
 * `AdminModal`：提供受控可取消的确认弹窗，标题/footer 固定且正文内部滚动。
 */
import AdminModal from '../AdminModal';
// 结果列表只在自己的区域内滚动，不使顶层布局发生页面滚动。
import './index.less';
// 弹窗理想宽度为 CSS 像素，AdminModal 同时限制窄窗口的最大宽度。
const GLOBAL_SEARCH_MODAL_WIDTH = 600;
/**
 * 顶部全局搜索组件。
 * @param {{ routes?: Array<Record<string, any>> }} props 组件参数。
 * @param {Array<Record<string, any>>} [props.routes=[]] 布局层透传的动态菜单树。
 * @returns {JSX.Element} 全局搜索触发器与搜索弹窗。
 */
const GlobalSearch = ({ routes = [] }) => {
  // visible/searchValue/searchResults 只属于一次搜索视图；关闭后不保留前次草稿。
  // `setVisible`：搜索弹窗的本地显示开关，打开与关闭时同步清空关键词和结果。
  const [visible, setVisible] = useState(false);
  // `searchValue`：当前搜索输入文本，组件局部持有；不会发往后端或写存储。
  // `setSearchValue`：更新本地关键词；输入变化由 effect 重新派生结果。
  const [searchValue, setSearchValue] = useState('');
  // `searchResults`：当前关键词匹配到的菜单条目数组，顺序由共享搜索规则决定。
  // `setSearchResults`：发布派生的本地结果；打开和关闭时主动清空旧结果。
  const [searchResults, setSearchResults] = useState([]);
  // 只从当前 routes 或静态配置派生条目，菜单更新后重新建立匹配源。
  const flattenedRoutes = useMemo(() => {
    // `resolvedRoutes`：动态菜单有效时使用动态树，否则使用静态框架路由，不合并重复来源。
    const resolvedRoutes = resolveGlobalSearchRoutes(routes, routeConfig);
    return flattenGlobalSearchRoutes(resolvedRoutes);
  }, [routes]);

  useEffect(
    /**
     * 菜单目录或搜索草稿变化时重新派生本地匹配结果，不触发请求，不改变唯一已选路由。
     * @returns {void}
     */ () => {
      // `nextResults`：本次菜单目录和关键词共同计算的匹配结果；不读取远程业务数据。
      const nextResults = filterGlobalSearchResults(flattenedRoutes, searchValue);
      setSearchResults(nextResults);
    },
    [flattenedRoutes, searchValue]
  );

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
    // `targetPath`：已命中菜单项的站内 path，来自共享扁平目录；选择后由 history 导航并清空弹窗。
    const targetPath = item?.path;
    history.push(targetPath);
    closeSearch();
  };

  /**
   * 处理搜索输入框的有效选择和退出动作，输入法确认不得触发导航。
   * @param {React.KeyboardEvent<HTMLInputElement>} event 当前输入框事件，先由共享规则检查组合输入/重复键/已消费状态。
   * @returns {void} select 仅在已有结果时选择首项；close 关闭并清空搜索草稿，其他事件保留自身行为。
   */
  const handleKeyDown = (event) => {
    // `action`：当前有效键盘动作 select/close/null；共享规则先排除输入法、重复键与已消费事件。
    const action = resolveGlobalSearchKeyAction(event);
    if (action === 'select' && searchResults.length > 0) {
      selectResult(searchResults[0]);
      return;
    }

    if (action === 'close') {
      closeSearch();
    }
  };

  useEventListener(
    'keydown',
    (/* `event`：document 快捷键事件；只有共享规则命中 Ctrl/Cmd+K 才阻止默认并打开弹窗。 */ event) => {
      if (!isGlobalSearchShortcut(event)) return;
      event.preventDefault();
      openSearch();
    },
    {
      target: /**
       * 为全局搜索快捷键提供当前 document 目标；监听的注册与卸载由 useEventListener 配对管理。
       * @returns {Document|undefined}
       */ () => globalThis.document,
    }
  );

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
            onChange={(/* `event`：受控输入变更事件，只取当前 value 更新本地搜索草稿。 */ event) =>
              setSearchValue(event.target.value)
            }
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
                    renderItem={(
                      /* `item`：当前搜索结果条目，展示 title/fullTitle 并在点击后交给统一选择入口。 */ item,
                      /* `index`：结果的零起始位置；首项加 active 视觉并作为 Enter 快捷目标。 */ index
                    ) => (
                      <List.Item
                        className={`search-result-item ${index === 0 ? 'active' : ''}`}
                        onClick={
                          /**
                           * 选择当前渲染条目并委托统一 selectResult 关闭搜索、执行站内导航，不从展示文字拼接路径。
                           * @returns {void}
                           */ () => selectResult(item)
                        }
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

// ───── 模块结束：src/components/GlobalSearch/index.jsx ─────
