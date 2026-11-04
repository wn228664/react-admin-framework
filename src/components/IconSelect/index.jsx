/**
 * 模块职责：按 Ant Design 图标名称提供本地图标筛选、风格分组、选择与清空入口。
 * 父级持有 value，组件只保存面板和搜索草稿；选择结果为图标名称，不保存 JSX 或访问后端。
 * 无效名称显示空图标；清空阻止事件冒泡，避免同时触发选择面板重新打开。
 */
// React state 只管理选择面板和搜索输入，已选图标由父级 value 决定。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 * `useRef`：保存当前触发输入框实例，选择或关闭后恢复焦点；卸载后 React 自动清空 DOM 引用。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import React, { useRef, useState } from 'react';
// Popover/Tabs 组织分组视图，受控 Input 展示名称并提供清空入口。
/**
 * `Input`：显示受控文本草稿，值更新和提交是两个独立动作。
 * `Button`：提供可聚焦的清空动作，原生按钮语义支持 Enter/Space，不依赖图标本身接收点击。
 * `Popover`：承载局部选择面板，显隐由当前实例持有，不复制父级已选值。
 * `Tabs`：组织固定声明的内容分组，不产生远端请求或自动保存草稿。
 */
import { Button, Input, Popover, Tabs } from 'antd';
// 图标导出表建立可选名称目录，value 只有命中真实导出时才能成为当前组件节点。
/**
 * `Icons`：Ant Design 真实图标导出目录，只允许命中导出名后创建节点。
 */
import * as Icons from '@ant-design/icons';
// 纯 helper 过滤图标导出、按风格分组并匹配名称。
/**
 * `ICON_SELECT_THEME_KEYS`：固定 outlined/filled/twoTone 分组顺序，作为筛选和初始分组的共同目录。
 * `ICON_SELECT_THEME_LABELS`：固定风格键对应的中文 Tab 文案，不参与实际组件导出解析。
 * `filterIconNames`：按关键字过滤图标名称列表，保持大小写不敏感。
 * `getSelectableIconNames`：从图标 key 列表中过滤出菜单选择器允许展示的图标集合。
 * `groupIconNamesByTheme`：把可选图标名称按主题分组。
 */
import {
  ICON_SELECT_THEME_KEYS,
  ICON_SELECT_THEME_LABELS,
  filterIconNames,
  getSelectableIconNames,
  groupIconNamesByTheme,
} from './utils';
// 图标网格与弹层高度在组件样式内限制，长结果使用自身滚动。
import './index.less';
// `ICON_SELECT_ICON_SIZE`：图标网格每项的显示尺寸 20 CSS px，与图标导出本身无关。
const ICON_SELECT_ICON_SIZE = 20;
// 只在模块初始化时枚举真实图标导出，避免每次输入重新遍历整库。
const SELECTABLE_ICON_NAMES = getSelectableIconNames(Object.keys(Icons));
// 静态名称分组不含用户选择；每次输入只在这些组内过滤。
const GROUPED_ICON_NAMES = groupIconNamesByTheme(SELECTABLE_ICON_NAMES);
/**
 * IconSelect 图标选择组件。
 * @param {{ value?: string, onChange?: (iconName: string) => void }} props 组件 props。
 * @returns {JSX.Element} IconSelect 图标选择组件。
 */
const IconSelect = ({
  /* `value`：父级当前选中的图标导出名；无效名称不创建当前图标，组件不保存第二份已选状态。 */ value,
  /* `onChange`：父级接收名称的同步通知；选择发送真实名称，清空发送空字符串。 */ onChange,
}) => {
  // 面板可见性与搜索草稿局部持有，value/onChange 仍由表单 owner 控制。
  // `visible`：本地 Popover 可见性，默认 false；已选值由父级 value 决定，关闭面板不清空父级选择。
  // `setVisible`：更新图标面板可见性；选择后关闭，当前 value 仍等待父级 onChange 回填。
  const [visible, setVisible] = useState(false);
  // `searchText`：本地搜索草稿，只过滤固定图标名称目录，不触发远端查询。
  // `setSearchText`：输入变更发布器，清空后恢复全部风格名称组。
  const [searchText, setSearchText] = useState('');
  // `inputRef`：当前只读触发输入框的 Antd 引用；选择或清空后恢复焦点，preventScroll 保持容器滚动位置。
  const inputRef = useRef(null);
  // `searchInputRef`：弹层搜索框引用；显现动画结束后用 preventScroll 聚焦，避免原生 autoFocus 在定位前滚动页面根。
  const searchInputRef = useRef(null);
  // `selectedName`：父级值在真实风格图标目录中的合法名称；异常值显示为空，禁止把工厂或 default 当作组件。
  const selectedName = typeof value === 'string' && SELECTABLE_ICON_NAMES.includes(value) ? value : '';
  /**
   * 处理只读触发框的键盘展开与关闭，不拦截输入法组合中的按键。
   * @param {React.KeyboardEvent<HTMLInputElement>} event 当前触发框键盘事件；打开键阻止浏览器默认行为。
   * @returns {void} 面板状态仅属于当前组件，不改变父级图标值。
   */
  const handleTriggerKeyDown = (event) => {
    if (event.nativeEvent?.isComposing || event.keyCode === 229) return;
    if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      setVisible(true);
    } else if (event.key === 'Escape') {
      setVisible(false);
    }
  };
  /**
   * 允许面板内的搜索、风格标签和图标按钮统一通过 Escape 返回触发框。
   * @param {React.KeyboardEvent<HTMLDivElement>} event 当前面板冒泡事件；组合输入期间保留原行为。
   * @returns {void} 关闭后将焦点交回当前选择器，不滚动页面根节点。
   */
  const handlePanelKeyDown = (event) => {
    if (event.key !== 'Escape' || event.nativeEvent?.isComposing) return;
    event.stopPropagation();
    setVisible(false);
    inputRef.current?.focus({ preventScroll: true });
  };
  // `filteredIconNamesByTheme`：当前搜索词对应的三风格名称数组，新建分组对象不改变静态名称目录。
  const filteredIconNamesByTheme = ICON_SELECT_THEME_KEYS.reduce(
    (
      /* `iconNamesByTheme`：reduce 本轮新建的分组累加器，每个固定风格保存独立过滤结果。 */ iconNamesByTheme,
      /* `themeKey`：当前待过滤的固定风格键，读取静态 GROUPED_ICON_NAMES。 */ themeKey
    ) => {
      iconNamesByTheme[themeKey] = filterIconNames(GROUPED_ICON_NAMES[themeKey], searchText);
      return iconNamesByTheme;
    },
    {}
  );

  /**
   * 处理图标选中事件。
   * @param {string} iconName 当前选中的图标名称。
   * @returns {void}
   */
  const handleSelect = (iconName) => {
    onChange?.(iconName);
    setVisible(false);
    inputRef.current?.focus({ preventScroll: true });
  };

  /**
   * 渲染单个风格下的图标网格。
   * @param {string[]} iconNames 当前风格下的图标名称列表。
   * @returns {JSX.Element} 图标网格节点。
   */
  const renderIconList = (iconNames) => {
    return (
      <div className="icon-list">
        {iconNames.map((/* `iconName`：网格中当前真实导出名，作为 React key、标题和选中通知值。 */ iconName) => {
          // `IconComponent`：当前名称命中的真实 Icons 导出；只从受控候选名称创建图标节点。
          const IconComponent = Icons[iconName];
          return (
            <button
              type="button"
              key={iconName}
              aria-label={iconName}
              aria-pressed={selectedName === iconName}
              className={`icon-item ${selectedName === iconName ? 'active' : ''}`}
              onClick={
                /**
                 * 提交本按钮闭包对应的真实图标导出名；关闭和焦点恢复统一交给 handleSelect，原生按钮同时支持 Enter/Space。
                 * @returns {void}
                 */ () => handleSelect(iconName)
              }
              title={iconName}
            >
              <IconComponent style={{ fontSize: ICON_SELECT_ICON_SIZE }} />
            </button>
          );
        })}
      </div>
    );
  };
  // `tabItems`：三种风格的 Antd Tabs 配置，标签包含当前匹配数量，正文复用网格渲染。
  const tabItems = ICON_SELECT_THEME_KEYS.map(
    (/* `themeKey`：当前 Tab 的固定风格键，用于读取中文标签和本轮过滤结果。 */ themeKey) => {
      // `iconNames`：当前 Tab 的已过滤名称数组，供数量展示与实际网格使用同一数据。
      const iconNames = filteredIconNamesByTheme[themeKey];
      return {
        key: themeKey,
        label: `${ICON_SELECT_THEME_LABELS[themeKey]} (${iconNames.length})`,
        children: renderIconList(iconNames),
      };
    }
  );
  // `content`：Popover 的当前搜索框和 Tab 内容节点，滚动边界由组件样式管理。
  const content = (
    <div className="icon-select-content" role="dialog" aria-label="选择图标面板" onKeyDown={handlePanelKeyDown}>
      <Input
        ref={searchInputRef}
        placeholder="搜索图标"
        value={searchText}
        onChange={(/* `event`：面板搜索输入的变更事件，只读取 target.value，不改变父级已选值。 */ event) =>
          setSearchText(event.target.value)
        }
        style={{ marginBottom: 16 }}
        allowClear
      />
      <Tabs items={tabItems} />
    </div>
  );

  /**
   * 清空当前已选图标，并阻止清空点击冒泡触发 Popover 展开。
   * @param {React.MouseEvent<HTMLElement>} event 当前鼠标事件对象。
   * @returns {void}
   */
  const handleClear = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onChange?.('');
    setVisible(false);
    inputRef.current?.focus({ preventScroll: true });
  };

  /**
   * `clearIcon` 为当前已选图标提供显式清空入口；无选中值时不渲染。
   * mouseDown 仅保留焦点并阻止冒泡，click 才通知父级一次；避免同一鼠标操作重复清空或重新展开面板。
   */
  const clearIcon = selectedName ? (
    <Button
      type="text"
      size="small"
      htmlType="button"
      aria-label="清空图标"
      className="icon-select-clear"
      icon={<Icons.CloseCircleFilled />}
      onMouseDown={(/* `event`：清空按钮按下事件；保留输入焦点并阻止 Popover 同次点击重新展开。 */ event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={handleClear}
    />
  ) : null;
  // 只有真实导出名称才渲染组件，无效或空值不创建占位业务图标。
  const CurrentIcon = selectedName ? Icons[selectedName] : null;

  return (
    <Popover
      content={content}
      destroyOnHidden
      trigger="click"
      open={visible}
      onOpenChange={setVisible}
      afterOpenChange={(/* `open`：本次浮层动画结束后的可见性；仅真正打开时聚焦，关闭不访问已销毁搜索框。 */ open) => {
        if (open) searchInputRef.current?.focus({ preventScroll: true });
      }}
      // bottom 同时启用水平/垂直 shift；角落定位仅翻转，短视口可能把搜索框翻到屏幕外。
      placement="bottom"
      // 移除箭头预留偏移，使 shift 的最终盒从视口边缘内开始，短窗口不裁掉顶部边框。
      align={{ offset: [0, 0] }}
      arrow={false}
      overlayClassName="icon-select-popover"
    >
      <Input
        ref={inputRef}
        value={selectedName}
        aria-label="选择图标"
        aria-haspopup="dialog"
        aria-expanded={visible}
        onKeyDown={handleTriggerKeyDown}
        placeholder="点击选择图标"
        readOnly
        // 前后缀始终保留同一层 span；Antd 在有/无 affix 间切换会重建 input，导致刚恢复的焦点丢失。
        prefix={<span>{CurrentIcon && <CurrentIcon />}</span>}
        suffix={<span>{clearIcon}</span>}
        style={{ cursor: 'pointer' }}
      />
    </Popover>
  );
};

export default IconSelect;

// ───── 模块结束：src/components/IconSelect/index.jsx ─────
