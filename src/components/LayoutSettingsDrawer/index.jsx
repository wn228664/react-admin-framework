/**
 * 模块职责：把布局偏好快照呈现为受控设置抽屉，并通过固定 Dva action 更新选项。
 * 只控制页签栏、侧栏标识及抽屉可见性，不修改菜单权限、路由或接口。
 * 设置项由本地静态目录声明，不把任意外部字段直接作为模型 key。
 */
// React 只渲染当前设置快照，没有镜像的偏好 state。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// Switch 回传显式布尔值，完成按钮只关闭当前抽屉。
/**
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 * `Switch`：发布明确的布尔开关值，模型字段由本地设置目录限定。
 */
import { Button, Switch } from 'antd';
// 复用正文滚动与受控关闭契约，自定义 footer 负责自己的按钮行为。
/**
 * `AdminDrawer`：提供受控抽屉、确认门闩和正文滚动，成功关闭仍由父级更新 open。
 */
import AdminDrawer from '../AdminDrawer';
// 设置行在窄容器内换行，正文溢出交给抽屉 body。
import './index.less';
// 仅这两个字段可由当前设置 UI 修改；showSettings 由关闭入口单独处理。
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
  // 从唯一 settings 快照读取可见性，省略模型时保守保持关闭。
  const drawerOpen = Boolean(settings?.showSettings);

  /**
   * 向唯一 settings 模型发布当前本地设置项的新值。
   * @param {string} key 固定目录字段，或关闭入口使用的 showSettings，不接受外部任意键。
   * @param {boolean} value 新的显示开关值，不影响菜单、权限或接口。
   * @returns {void} 通过 dispatch/changeSetting 更新内存，不发网络请求。
   */
  const handleSettingChange = (key, value) => {
    dispatch({
      type: 'settings/changeSetting',
      payload: { key, value },
    });
  };

  /**
   * 把 showSettings 设置为 false，父级模型随后驱动受控抽屉关闭。
   * @returns {void} 不更改 tagsView/sidebarLogo，也不销毁页面缓存。
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

        {LAYOUT_SETTING_ITEMS.map(
          (/* `item`：本地固定设置目录中的当前项，key 只允许 tagsView/sidebarLogo，不使用任意外部字段。 */ item) => (
            <div className="layout-settings-drawer__item" key={item.key}>
              <div className="layout-settings-drawer__item-main">
                <span className="layout-settings-drawer__item-title">{item.label}</span>
                <span className="layout-settings-drawer__item-description">{item.description}</span>
              </div>
              <Switch
                checked={Boolean(settings?.[item.key])}
                onChange={(/* `checked`：Switch 发布的显式布尔值，直接作为当前固定设置 key 的新值。 */ checked) =>
                  handleSettingChange(item.key, checked)
                }
              />
            </div>
          )
        )}
      </div>
    </AdminDrawer>
  );
};

export default LayoutSettingsDrawer;

// ───── 模块结束：src/components/LayoutSettingsDrawer/index.jsx ─────
