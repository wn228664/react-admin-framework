/**
 * 模块职责：维护侧栏开关、设备显示模式和组件尺寸，供 BasicLayout 响应式布局消费。
 * 侧栏与尺寸使用非敏感 Cookie 恢复；reducers 返回新快照，不保存接口结果或用户凭证。
 * 浏览器禁止 Cookie 时使用默认布局；写入失败保留内存交互，不承诺偏好已持久化或跨设备同步。
 */
// js-cookie 只读写 sidebarStatus/size 两个外观键，与会话 Token 分开。
/**
 * `Cookies`：读写非敏感偏好或明确会话 Cookie；属性访问/读写异常由当前边界处理。
 */
import Cookies from 'js-cookie';
// 偏好故障只记录公开文案，不输出 Cookie 值或异常携带的敏感字段。
/**
 * `logger`：提供统一诊断入口；warn/error 在生产仍可能输出，调用前必须移除秘密和原始响应。
 */
import logger from '@/utils/logger';

/**
 * 读取一个非敏感布局偏好，受限 Cookie 不能阻止模型初始化。
 * @param {string} key sidebarStatus 或 size，由本模块固定调用点提供。
 * @param {string} fallback 缺值或访问异常时使用的布局默认值。
 * @returns {string} 当前 Cookie 文本或 fallback；不参与认证状态判断。
 */
function readPreference(key, fallback) {
  try {
    return Cookies.get(key) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * 尝试保存外观偏好，失败只反馈诊断，布局 reducer 仍可发布内存状态。
 * @param {string} key 本模块固定的非敏感 Cookie 键。
 * @param {string|number} value 已由布局交互确定的候选值。
 * @returns {void} 不把无异常等同于浏览器最终成功持久化。
 */
function persistPreference(key, value) {
  try {
    Cookies.set(key, value);
  } catch {
    logger.warn('无法保存布局偏好，当前界面状态仍已更新');
  }
}

export default {
  namespace: 'app',

  // 侧栏状态在模块初始化时恢复；device 为界面模式标记，不用于权限或能力判断。
  state: {
    sidebar: {
      opened: !!+readPreference('sidebarStatus', '1'),
      withoutAnimation: false,
    },
    device: 'desktop',
    size: readPreference('size', 'middle'),
  },

  effects: {},

  reducers: {
    /**
     * 反转当前侧栏状态并保存 sidebarStatus；新状态恢复正常动画。
     * @param {Object} state 当前布局模型。
     * @returns {Object} 新快照；Cookie 写入失败不撤销本次界面交互。
     */
    toggleSidebar(state) {
      // `opened`：由当前 sidebar.opened 反转得到的下一可见性；先尝试保存偏好，存储失败仍发布该内存布局。
      const opened = !state.sidebar.opened;
      persistPreference('sidebarStatus', opened ? 1 : 0);
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          opened,
          withoutAnimation: false,
        },
      };
    },

    /**
     * 收起侧栏并保存偏好，供窄屏导航完成后调用。
     * @param {Object} state 当前模型。
     * @param {Object} action payload.withoutAnimation 可禁用本次收起动画，默认 false。
     * @returns {Object} 保留其他字段的收起态。
     */
    closeSidebar(
      state,
      {
        /* `payload`：关闭动作携带的局部配置，缺省空对象；只读取 withoutAnimation，不替换其它布局字段。 */ payload = {},
      }
    ) {
      persistPreference('sidebarStatus', 0);
      return {
        ...state,
        sidebar: {
          opened: false,
          withoutAnimation: payload.withoutAnimation || false,
        },
      };
    },

    /**
     * 替换界面设备模式标记；payload 由布局适配层提供，不做 UA 能力或权限推断。
     * @param {Object} state 当前模型。
     * @param {Object} action payload 为模式文本。
     * @returns {Object} 新布局快照。
     */
    toggleDevice(
      state,
      { /* `payload`：响应式布局发布的设备显示模式文本；只改变界面状态，不参与权限或浏览器能力判断。 */ payload }
    ) {
      return {
        ...state,
        device: payload,
      };
    },

    /**
     * 更新组件尺寸偏好并保存 size Cookie，不改变页面内容或接口参数。
     * @param {Object} state 当前模型。
     * @param {Object} action payload 应为接入 UI 库支持的尺寸值。
     * @returns {Object} 新快照，非法尺寸需由设置入口先限制。
     */
    setSize(state, { /* `payload`：设置入口提供的合法 Antd 尺寸值；同时写内存与非敏感偏好 Cookie。 */ payload }) {
      persistPreference('size', payload);
      return {
        ...state,
        size: payload,
      };
    },
  },
};

// ───── 模块结束：src/models/app.js ─────
