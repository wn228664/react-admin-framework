import { useLayoutEffect, useRef, useState } from 'react';

const outerHeight = (element) => {
  if (!element) return 0;
  const style = getComputedStyle(element);
  return (
    element.getBoundingClientRect().height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)
  );
};

/** 高度服从父组件，而非 window：同一个表格可放入页面、弹窗和抽屉。 */
export default function useTableHeight({ dataSource, loading, hasPagination = true }) {
  const containerRef = useRef(null);
  const tableRef = useRef(null);
  const [tableHeight, setTableHeight] = useState(1);
  useLayoutEffect(() => {
    const root = tableRef.current;
    const card = root?.querySelector('.ant-card-body');
    if (!card) return undefined;
    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const body = card.querySelector('.ant-table-body');
        const header = card.querySelector('.ant-table-thead');
        if (!body && !header) return;
        const top = body ? body.getBoundingClientRect().top : header.getBoundingClientRect().bottom;
        const padding = parseFloat(getComputedStyle(card).paddingBottom) || 0;
        // 分页与 footer 留在滚动区之外；空数据、搜索展开也使用相同的父容器预算。
        const reserved =
          (hasPagination ? outerHeight(card.querySelector('.ant-pagination')) : 0) +
          outerHeight(card.querySelector('.ant-table-footer')) +
          padding +
          2;
        const height = Math.max(1, Math.floor(card.getBoundingClientRect().bottom - top - reserved));
        setTableHeight((previous) => (previous === height ? previous : height));
      });
    };
    const observer = new ResizeObserver(measure);
    const observe = () => {
      observer.disconnect();
      [
        card,
        ...card.querySelectorAll(
          '.search-form-container, .pro-table-title, .ant-table-thead, .ant-pagination, .ant-table-footer'
        ),
      ].forEach((el) => observer.observe(el));
      measure();
    };
    const mutations = new MutationObserver(observe);
    mutations.observe(card, { childList: true, subtree: true });
    observe();
    window.addEventListener('resize', measure);
    // 弹层入场的 transform 不触发 ResizeObserver，动画结束后再核对一次实际空间。
    const afterMotion = (event) => {
      if (event.target.contains?.(root)) measure();
    };
    document.addEventListener('animationend', afterMotion, true);
    document.addEventListener('transitionend', afterMotion, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('animationend', afterMotion, true);
      document.removeEventListener('transitionend', afterMotion, true);
    };
  }, [dataSource, loading, hasPagination]);
  return { containerRef, tableRef, tableHeight };
}
