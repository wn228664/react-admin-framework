/**
 * @file src/components/IconSelect/index.jsx
 * @description IconSelect 图标选择组件，统一承载 Ant Design 图标的搜索、分组展示与回填选择交互。
 * @example `<IconSelect value={form.getFieldValue('icon')} onChange={(iconName) => form.setFieldValue('icon', iconName)} />`
 */
import React, { useState } from 'react';
import { Input, Popover, Tabs } from 'antd';
import * as Icons from '@ant-design/icons';
import {
  ICON_SELECT_THEME_KEYS,
  ICON_SELECT_THEME_LABELS,
  filterIconNames,
  getSelectableIconNames,
  groupIconNamesByTheme,
} from './utils';
import './index.less';
const ICON_SELECT_ICON_SIZE = 20;
const SELECTABLE_ICON_NAMES = getSelectableIconNames(Object.keys(Icons));
const GROUPED_ICON_NAMES = groupIconNamesByTheme(SELECTABLE_ICON_NAMES);
/**
 * IconSelect 图标选择组件。
 * @param {{ value?: string, onChange?: (iconName: string) => void }} props 组件 props。
 * @returns {JSX.Element} IconSelect 图标选择组件。
 */
const IconSelect = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const filteredIconNamesByTheme = ICON_SELECT_THEME_KEYS.reduce((iconNamesByTheme, themeKey) => {
    iconNamesByTheme[themeKey] = filterIconNames(GROUPED_ICON_NAMES[themeKey], searchText);
    return iconNamesByTheme;
  }, {});

  /**
   * 处理图标选中事件。
   * @param {string} iconName 当前选中的图标名称。
   * @returns {void}
   */
  const handleSelect = (iconName) => {
    onChange?.(iconName);
    setVisible(false);
  };

  /**
   * 渲染单个风格下的图标网格。
   * @param {string[]} iconNames 当前风格下的图标名称列表。
   * @returns {JSX.Element} 图标网格节点。
   */
  const renderIconList = (iconNames) => {
    return (
      <div className="icon-list">
        {iconNames.map((iconName) => {
          const IconComponent = Icons[iconName];
          return (
            <div
              key={iconName}
              className={`icon-item ${value === iconName ? 'active' : ''}`}
              onClick={() => handleSelect(iconName)}
              title={iconName}
            >
              <IconComponent style={{ fontSize: ICON_SELECT_ICON_SIZE }} />
            </div>
          );
        })}
      </div>
    );
  };
  const tabItems = ICON_SELECT_THEME_KEYS.map((themeKey) => {
    const iconNames = filteredIconNamesByTheme[themeKey];
    return {
      key: themeKey,
      label: `${ICON_SELECT_THEME_LABELS[themeKey]} (${iconNames.length})`,
      children: renderIconList(iconNames),
    };
  });
  const content = (
    <div className="icon-select-content">
      <Input
        placeholder="搜索图标"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
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
  };

  /**
   * `clearIcon` 为当前已选图标提供显式清空入口；无选中值时不渲染。
   * 这里单独拦截 `mouseDown` 与 `click`，避免清空动作被 Popover 的 click trigger 识别成“打开面板”。
   */
  const clearIcon = value ? (
    <Icons.CloseCircleFilled
      onMouseDown={handleClear}
      onClick={handleClear}
      style={{ color: 'rgba(0, 0, 0, 0.25)', cursor: 'pointer' }}
    />
  ) : null;
  const CurrentIcon = value && Icons[value] ? Icons[value] : null;

  return (
    <Popover
      content={content}
      trigger="click"
      open={visible}
      onOpenChange={setVisible}
      placement="bottomLeft"
      overlayClassName="icon-select-popover"
    >
      <Input
        value={value}
        placeholder="点击选择图标"
        readOnly
        prefix={CurrentIcon && <CurrentIcon />}
        suffix={clearIcon}
        style={{ cursor: 'pointer' }}
      />
    </Popover>
  );
};

export default IconSelect;
