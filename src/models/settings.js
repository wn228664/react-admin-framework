/**
 * @file src/models/settings.js
 * @description 系统设置的状态管理，控制标签页显示、固定头部、侧边栏 Logo 等布局配置项
 */
export default {
  namespace: 'settings',

  state: {
    showSettings: false,
    tagsView: true,
    sidebarLogo: true,
  },

  effects: {},

  reducers: {
    changeSetting(state, { payload }) {
      const { key, value } = payload;
      return {
        ...state,
        [key]: value,
      };
    },
  },
};
