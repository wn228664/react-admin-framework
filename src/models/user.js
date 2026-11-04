/**
 * 模块职责：保存界面展示所需的权限与角色快照，不承担登录、Token 或服务端鉴权。
 * setAccess 由会话接入层发布，clearAccess 撤销可见入口；客户端显隐不构成安全授权。
 */
export default {
  namespace: 'user',
  state: { permissions: [], roles: [] },
  reducers: {
    /**
     * 接受当前会话已解析的授权列表，缺少列表时使用空数组。
     * @param {Object} state 当前用户视图状态。
     * @param {Object} action payload.permissions/roles 来自可信会话解码器。
     * @returns {Object} 替换后的快照，不合并前一账号的授权。
     */
    setAccess(
      state,
      {
        /* `payload`：可信认证接入层解析的权限与角色对象；两个列表整体替换，缺少列表时使用空数组，不合并旧账号。 */ payload,
      }
    ) {
      return { ...state, permissions: payload.permissions || [], roles: payload.roles || [] };
    },
    /**
     * 撤销所有客户端权限/角色展示；服务端退出与 Cookie 清理由会话层另外执行。
     * @returns {Object} 两个全新空列表，不能把清空界面当成服务端凭证已失效。
     */
    clearAccess() {
      return { permissions: [], roles: [] };
    },
  },
};

// ───── 模块结束：src/models/user.js ─────
