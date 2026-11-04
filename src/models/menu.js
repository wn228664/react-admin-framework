/**
 * 模块职责：给侧栏、全局搜索和面包屑共享当前菜单路由树。
 * 初始值来自中性静态路由；setRoutes 只替换内存快照，远程菜单解码与权限裁决由接入层负责。
 */
// menuRoutes 提供两个可删除的框架演示入口，模型不内置业务菜单接口。
/**
 * `menuRoutes`：中性菜单目录，只包含正常页面，根重定向/刷新中转/404 留在路由外壳。
 */
import { menuRoutes } from '@/config/routes';

export default {
  namespace: 'menu',
  state: { routes: menuRoutes },
  reducers: {
    /**
     * 替换当前菜单快照，不合并旧菜单或发请求。
     * @param {Object} state 当前 menu model。
     * @param {Object} action payload 为接入层已经校验的完整路由树。
     * @returns {Object} 新模型快照，调用方应同时处理已失效的页面/缓存。
     */
    setRoutes(
      state,
      { /* `payload`：接入层已校验的完整菜单路由数组；替换后失效标签和缓存的协调仍由调用方负责。 */ payload }
    ) {
      return { ...state, routes: payload };
    },
  },
};

// ───── 模块结束：src/models/menu.js ─────
