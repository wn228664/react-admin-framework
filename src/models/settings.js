/**
 * 模块职责：保存布局设置抽屉、页签栏和侧栏标识的当前显示偏好。
 * 状态只属于此页内存，不写认证信息或请求配置；布局组件从同一份 Dva 快照读取。
 */
export default {
  namespace: 'settings',

  // showSettings 控制设置抽屉，tagsView/sidebarLogo 只控制可见布局，不删除路由或缓存。
  state: {
    showSettings: false,
    tagsView: true,
    sidebarLogo: true,
  },

  effects: {},

  reducers: {
    /**
     * 按设置界面的固定字段更新一个布局值，不执行存储或网络副作用。
     * @param {Object} state 当前偏好快照。
     * @param {Object} action payload.key/value 由 LayoutSettingsDrawer 的设置项提供。
     * @returns {Object} 新对象供布局重新渲染；接入外部配置时应先限制字段白名单。
     */
    changeSetting(
      state,
      {
        /* `payload`：LayoutSettingsDrawer 发布的 {key,value}，必须包含已验证字段；不是任意后端响应的直接解包。 */ payload,
      }
    ) {
      // `key`：设置抽屉固定项提供的模型字段名，如 tagsView/sidebarLogo；外部配置接入前须限制字段集合。
      // `value`：该设置项的新显示值，保留调用方已确认的类型；这里只替换一个内存偏好，不发请求。
      const { key, value } = payload;
      return {
        ...state,
        [key]: value,
      };
    },
  },
};

// ───── 模块结束：src/models/settings.js ─────
