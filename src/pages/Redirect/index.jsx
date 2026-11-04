/**
 * 模块职责：为标签页刷新提供一次不缓存的中转提交，使旧页面先卸载再重新创建。
 * 本页面没有业务内容或请求；仅在 effect 提交后 replace 回经过本地路径校验的目标。
 * 路径前缀 /redirect 为框架保留入口，不得登记为普通菜单或缓存页面。
 */
// useEffect 在中转节点提交后恢复导航，保证旧缓存实例有机会先完成卸载与资源清理。
import { useEffect } from 'react';
// useLocation 读取本次中转地址，history.replace 不把中转页额外留在浏览器历史中。
import { history, useLocation } from 'umi';
// resolveRefreshTarget 保留普通查询/hash，拒绝跨源、控制字符和递归中转目标。
import { resolveRefreshTarget } from '@/utils/nav';

/**
 * 创建无正文的刷新中转页，由根路由以 meta.noCache=true 挂载。
 * @returns {null} 等待一次提交后返回原页；无效目标回首页，不产生网络或存储副作用。
 */
export default function Redirect() {
  // location：Umi 当前中转位置快照，包含原页面编码后的 pathname/search/hash。
  const location = useLocation();
  // target：经过共享校验的站内恢复地址，只交给 history，不用 window.open 或 location.assign。
  const target = resolveRefreshTarget(location);
  useEffect(
    /**
     * 在中转页提交后 replace 到已校验站内目标，让旧缓存实例先完成释放；不把中转路径保存为访问标签。
     * @returns {void}
     */ () => {
      history.replace(target);
    },
    [target]
  );
  return null;
}

// ───── 模块结束：src/pages/Redirect/index.jsx ─────
