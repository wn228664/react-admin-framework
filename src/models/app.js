/**
 * @file src/models/app.js
 * @description 应用全局状态管理，控制侧边栏展开收起、设备类型识别和组件尺寸等基础布局状态
 */
import Cookies from 'js-cookie';

export default {
  namespace: 'app',

  state: {
    sidebar: {
      opened: Cookies.get('sidebarStatus') ? !!+Cookies.get('sidebarStatus') : true,
      withoutAnimation: false,
    },
    device: 'desktop',
    size: Cookies.get('size') || 'middle',
  },

  effects: {},

  reducers: {
    toggleSidebar(state) {
      const opened = !state.sidebar.opened;
      Cookies.set('sidebarStatus', opened ? 1 : 0);
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          opened,
          withoutAnimation: false,
        },
      };
    },

    closeSidebar(state, { payload = {} }) {
      Cookies.set('sidebarStatus', 0);
      return {
        ...state,
        sidebar: {
          opened: false,
          withoutAnimation: payload.withoutAnimation || false,
        },
      };
    },

    toggleDevice(state, { payload }) {
      return {
        ...state,
        device: payload,
      };
    },

    setSize(state, { payload }) {
      Cookies.set('size', payload);
      return {
        ...state,
        size: payload,
      };
    },
  },
};
