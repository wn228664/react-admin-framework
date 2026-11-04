/**
 * 模块职责：根据站内路径变化维护淡入/淡出的展示阶段，不持有路由 Outlet 或页面数据。
 * 动画结束后才更新内部路径快照；children 始终由父级提供，缓存状态仍归 RouteKeepAliveOutlet。
 * 它不等待接口完成，也不能替代错误态和加载态。
 */
// React 状态保存上一条展示路径和动画阶段，effect 观察导航变化。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import React, { useEffect, useState } from 'react';
// pathname 是换场动画的身份，只有 search/hash 改变时仍属于同一页面展示周期。
/**
 * `useLocation`：读取本次已确认导航的位置快照，pathname/search/hash 的具体消费由当前组件决定。
 */
import { useLocation } from 'umi';
// 动画只改变 opacity/transform，父级仍需提供有界高度。
import './index.less';

/**
 * 包裹父级提供的内容，并为 pathname 变化选择展示动画。
 * @param {Object} props children 是当前页面节点，不会被本组件重新生成路由。
 * @returns {React.ReactElement} 内容外壳，路径未变时不重置阶段。
 */
const PageTransition = ({
  /* `children`：父级提供的当前页面节点；动画壳不会延迟或重建路由 Outlet，缓存仍归专用出口。 */ children,
}) => {
  // `location`：Umi 当前路由位置快照，仅 pathname 改变触发淡出，查询/hash 变化不重启阶段。
  const location = useLocation();
  // displayLocation 保存已完成过渡的路径，transitionStage 仅表示视觉阶段，不表示业务就绪。
  // `setDisplayLocation`：淡出完成后记录已切换的路径快照，不操作 history 或缓存实例。
  const [displayLocation, setDisplayLocation] = useState(location);
  // `transitionStage`：fadeIn/fadeOut 视觉阶段，不能用来推断接口成功或页面可用。
  // `setTransitionStage`：按路径变化和动画结束更新视觉阶段，不持有页面业务状态。
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(
    /**
     * 真实 pathname 与当前显示快照不同才开始退场；等动画结束后切换快照，不能在这里直接销毁旧页面。
     * @returns {void}
     */ () => {
      if (location.pathname !== displayLocation.pathname) {
        setTransitionStage('fadeOut');
      }
    },
    [location, displayLocation]
  );

  /**
   * 仅在淡出结束时切回淡入并更新路径快照；不产生新的 history 记录。
   * @returns {void}
   */
  const onAnimationEnd = () => {
    if (transitionStage === 'fadeOut') {
      setTransitionStage('fadeIn');
      setDisplayLocation(location);
    }
  };

  return (
    <div className={`page-transition ${transitionStage}`} onAnimationEnd={onAnimationEnd}>
      {children}
    </div>
  );
};

export default PageTransition;

// ───── 模块结束：src/components/PageTransition/index.jsx ─────
