/**
 * @file src/components/LayoutSettingsDrawer/index.jsx
 * @description 布局设置抽屉：承接 BasicLayout 用户菜单里的“布局设置”入口，统一切换标签栏、固定头部和侧栏 Logo 的显示策略。
 */
import React from 'react';
import { Button, Switch } from 'antd';
import AdminDrawer from '../AdminDrawer';
import './index.less';
const LAYOUT_SETTING_ITEMS = [
  {
    key: 'tagsView',
    label: '页签栏',
    description: '控制顶部 TagsView 是否显示，影响已访问页面的快速切换入口。',
  },
  {
    key: 'sidebarLogo',
    label: '侧栏 Logo',
    description: '控制侧栏标题区是否显示，关闭后让菜单从顶部直接开始渲染。',
  },
];

/**
 * 布局设置抽屉组件。
 * @param {Object} props - 组件属性。
 * @param {Object} props.settings - settings model 当前快照，提供抽屉显隐和三个布局开关的值。
 * @param {Function} props.dispatch - Dva dispatch，用于复用 settings/changeSetting reducer 契约。
 * @returns {JSX.Element} 受控布局设置抽屉。
 */
const LayoutSettingsDrawer = ({ settings, dispatch }) => {
  const drawerOpen = Boolean(settings?.showSettings);

  /**
   * 复用 settings/changeSetting 契约更新单个布局开关。
   * @param {string} key - settings model 中要修改的字段名。
   * @param {boolean} value - 新的开关值。
   */
  const handleSettingChange = (key, value) => {
    dispatch({
      type: 'settings/changeSetting',
      payload: { key, value },
    });
  };

  /**
   * 关闭布局设置抽屉。
   * 这里单独收口 showSettings，避免 BasicLayout 和 Drawer 各自维护一份关闭逻辑。
   */
  const handleClose = () => {
    handleSettingChange('showSettings', false);
  };

  return (
    <AdminDrawer
      title="布局设置"
      open={drawerOpen}
      onClose={handleClose}
      width={360}
      maskClosable
      destroyOnHidden={false}
      className="layout-settings-drawer"
      footer={
        <div className="layout-settings-drawer__footer">
          <Button onClick={handleClose}>完成</Button>
        </div>
      }
    >
      <div className="layout-settings-drawer__content">
        <div className="layout-settings-drawer__intro">
          <h3 className="layout-settings-drawer__intro-title">布局偏好</h3>
          <p className="layout-settings-drawer__intro-description">
            这些开关会立即作用于当前后台主布局，不会改变菜单权限、路由定义和接口契约。
          </p>
        </div>

        {LAYOUT_SETTING_ITEMS.map((item) => (
          <div className="layout-settings-drawer__item" key={item.key}>
            <div className="layout-settings-drawer__item-main">
              <span className="layout-settings-drawer__item-title">{item.label}</span>
              <span className="layout-settings-drawer__item-description">{item.description}</span>
            </div>
            <Switch
              checked={Boolean(settings?.[item.key])}
              onChange={(checked) => handleSettingChange(item.key, checked)}
            />
          </div>
        ))}
      </div>
    </AdminDrawer>
  );
};

export default LayoutSettingsDrawer;
