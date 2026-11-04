/**
 * 模块职责：按 Card 实际可用空间计算 Table 的 scroll.y，供页面、弹窗和抽屉共享。
 * 搜索、表头、分页和 footer 从固定预算中扣除，正文只取得剩余高度；不以 window 高度猜容器尺寸。
 * ResizeObserver/MutationObserver 与动画结束事件触发合并测量，卸载时清理观察者、监听与待执行帧。
 */
// layout effect 在布局提交后测量，ref 指向实际父容器，state 只在高度变化时发布新预算。
/**
 * `useLayoutEffect`：在布局提交后、浏览器绘制前测量或绑定上下文；清理与挂载严格配对。
 * `useRef`：保存跨渲染 owner、DOM 或任务身份；写 current 不会触发重渲染，清理由配对生命周期负责。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 读取固定区域的边框盒与垂直 margin，避免分页外边距侵占正文。
 * @param {HTMLElement|null} element 待扣除的固定区域；不存在时不占预算。
 * @returns {number} CSS 像素高度，不会修改 DOM。
 */
const outerHeight = (element) => {
  if (!element) return 0;
  // `style`：当前固定区的计算样式，仅读取上下 margin；parseFloat 失败视为 0，单位 CSS px。
  const style = getComputedStyle(element);
  return (
    element.getBoundingClientRect().height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)
  );
};

/**
 * 为 Table 提供确定的正文高度与两个挂载 ref。
 * @param {Object} options dataSource/loading 变化后重新绑定结构；hasPagination 默认 true。
 * @returns {Object} containerRef、tableRef、tableHeight（CSS 像素，最少 1）。
 * 父容器高度必须先确定；本 Hook 不隐藏分页，也不通过放开页面滚动规避裁切。
 */
export default function useTableHeight({
  /* `dataSource`：当前页数据引用，只作为结构重绑依赖，不参与行高猜测。 */ dataSource,
  /* `loading`：当前加载状态，变化后重新获取 Antd 结构，避免占位/数据态测量沿用旧节点。 */ loading,
  /* `hasPagination`：是否从正文预算扣除分页区，默认 true；外部 pagination=false 时传 false。 */ hasPagination = true,
}) {
  // containerRef 用于外层有界容器，tableRef 用于查询内部 Card；调用方必须同时挂载对应节点。
  const containerRef = useRef(null);
  const tableRef = useRef(null);
  // 初始 1px 防止首次渲染把表格撑出父容器，首轮布局测量后替换为真实预算。
  // `setTableHeight`：只在测量预算改变时发布新高度，避免 Observer 触发无意义重渲染。
  const [tableHeight, setTableHeight] = useState(1);
  useLayoutEffect(
    /**
     * 为当前表格容器建立尺寸、结构和过渡监听，首帧测量正文预算；返回统一释放帧任务与观察者的清理入口。
     * @returns {Function|undefined} 没有真实容器时不绑定。
     */ () => {
      // `root`：此 effect 开始时捕获的 tableRef DOM；动画事件仅针对包含该表格的祖先重测。
      const root = tableRef.current;
      // `card`：Antd Card 正文容器；不存在则本轮不绑定观察者，避免对空节点读取尺寸。
      const card = root?.querySelector('.ant-card-body');
      if (!card) return undefined;
      // 同一 effect owner 只保留最后一个测量帧；重测与卸载都先取消旧帧。
      let frame;
      /**
       * 取消上次测量帧，再在下一帧读取固定区域位置并发布正文剩余高度。
       * @returns {void} 没有表格结构时保持现有预算，不创建轮询。
       */
      const measure = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(
          /**
           * 在合并后的绘制帧读取表头、分页和正文位置，计算非负滚动高度并按实际变化发布，避免 resize 频率下强制布局。
           * @returns {void}
           */ () => {
            // `body`：当前表格正文滚动节点；其顶部是正文预算的起点。
            const body = card.querySelector('.ant-table-body');
            // `header`：当前表头节点；空数据尚未生成正文时用其底部作为预算起点。
            const header = card.querySelector('.ant-table-thead');
            if (!body && !header) return;
            // `top`：正文起点相对视口的纵坐标，单位 CSS px；和 Card 底部在同一坐标系。
            const top = body ? body.getBoundingClientRect().top : header.getBoundingClientRect().bottom;
            // `padding`：Card 的底部内边距，单位 CSS px；需从正文可用高度中扣除。
            const padding = parseFloat(getComputedStyle(card).paddingBottom) || 0;
            // 分页与 footer 留在滚动区之外；空数据、搜索展开也使用相同的父容器预算。
            // `reserved`：分页、footer、底部内边距和 2px 边界余量的总预算，单位 CSS px。
            const reserved =
              (hasPagination ? outerHeight(card.querySelector('.ant-pagination')) : 0) +
              outerHeight(card.querySelector('.ant-table-footer')) +
              padding +
              2;
            // `height`：向下取整且至少 1px 的正文高度；固定区域始终留在滚动区外。
            const height = Math.max(1, Math.floor(card.getBoundingClientRect().bottom - top - reserved));
            setTableHeight(
              (/* `previous`：React 在提交时提供的前一高度；相同值直接返回，抑制观察者反馈循环。 */ previous) =>
                previous === height ? previous : height
            );
          }
        );
      };
      // `observer`：本 effect 唯一 ResizeObserver，监听 Card 和固定区尺寸；结构变化时重绑，卸载断开。
      const observer = new ResizeObserver(measure);
      /**
       * 结构改变后重新选择被观察的搜索、表头、分页和 footer，并请求一次测量。
       * @returns {void} 复用同一个 ResizeObserver，避免动态节点导致观察者累积。
       */
      const observe = () => {
        observer.disconnect();
        [
          card,
          ...card.querySelectorAll(
            '.search-form-container, .pro-table-title, .ant-table-thead, .ant-pagination, .ant-table-footer'
          ),
        ].forEach((/* `el`：当前需要观察的 Card 或搜索/表头/分页/footer 节点，均来自当前 Card 子树。 */ el) =>
          observer.observe(el)
        );
        measure();
      };
      // `mutations`：本 effect 的结构观察者；子树增删后刷新尺寸监听，卸载时断开，避免持有旧 DOM。
      const mutations = new MutationObserver(observe);
      mutations.observe(card, { childList: true, subtree: true });
      observe();
      window.addEventListener('resize', measure);
      /**
       * 仅在包含当前表格的祖先结束入场动画/过渡后重测，因为 transform 不改变 ResizeObserver 尺寸。
       * @param {Event} event document 捕获阶段收到的动画或过渡结束事件。
       * @returns {void}
       */
      const afterMotion = (event) => {
        if (event.target.contains?.(root)) measure();
      };
      document.addEventListener('animationend', afterMotion, true);
      document.addEventListener('transitionend', afterMotion, true);
      return (
        /**
         * 取消待测量帧并断开本表格的尺寸/结构观察与窗口监听，旧实例不得继续读取 DOM 或回写高度。
         * @returns {void}
         */ () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          mutations.disconnect();
          window.removeEventListener('resize', measure);
          document.removeEventListener('animationend', afterMotion, true);
          document.removeEventListener('transitionend', afterMotion, true);
        }
      );
    },
    [dataSource, loading, hasPagination]
  );
  return { containerRef, tableRef, tableHeight };
}

// ───── 模块结束：src/components/ProTable/useTableHeight.js ─────
