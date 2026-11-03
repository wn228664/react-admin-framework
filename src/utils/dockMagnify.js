/**
 * @file src/utils/dockMagnify.js
 * @description Dock-like magnify（基于指针距离的起伏/放大）。
 *
 * 设计目标：
 * - 仅在 mouse/pen 指针下生效（兼容 iPadOS/Safari Pointer Events）。
 * - 不侵入业务组件，只通过 CSS Variables 驱动 transform。
 * - 高频 pointermove 使用 requestAnimationFrame 节流，避免抖动与性能问题。
 * - 性能优化：缓存元素中心点，避免每帧对每个 item 调用 getBoundingClientRect 触发 reflow。
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const lowerBound = (arr, value) => {
  let left = 0;
  let right = arr.length;
  while (left < right) {
    const mid = (left + right) >> 1;
    if (arr[mid] < value) left = mid + 1;
    else right = mid;
  }
  return left;
};

/**
 * 给容器挂载 Dock magnify 行为。
 *
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.itemSelector - 命中的 item 选择器（在 container 内 query）
 * @param {'x'|'y'} [options.axis='x'] - 距离轴：横向(x)/纵向(y)
 * @param {number} [options.radius=120] - 影响半径（px）
 * @param {number} [options.minScale=1] - 最小缩放
 * @param {number} [options.maxScale=1.12] - 最大缩放
 * @param {number} [options.maxLift=6] - 最大上浮（px）
 * @param {number} [options.falloff=2] - 衰减曲线（幂次，越大越“集中”）
 * @param {string[]} [options.pointerTypes=['mouse','pen']] - 允许的 pointerType
 * @param {string} [options.cssVarScale='--framework-dock-scale-js']
 * @param {string} [options.cssVarTranslateY='--framework-dock-ty-js']
 * @param {string} [options.activeClass] - 命中该 class 的元素（如选中态），给予 baseline boost
 * @param {number} [options.activeBoost=0] - baseline boost（0-1）
 * @returns {() => void} cleanup
 */
export const attachDockMagnify = (container, options = {}) => {
  if (!container || typeof container.addEventListener !== 'function') {
    return () => {};
  }

  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
  const caf = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : (id) => clearTimeout(id);

  const config = {
    itemSelector: options.itemSelector,
    axis: options.axis || 'x',
    radius: typeof options.radius === 'number' ? options.radius : 120,
    minScale: typeof options.minScale === 'number' ? options.minScale : 1,
    maxScale: typeof options.maxScale === 'number' ? options.maxScale : 1.12,
    maxLift: typeof options.maxLift === 'number' ? options.maxLift : 6,
    falloff: typeof options.falloff === 'number' ? options.falloff : 2,
    pointerTypes: options.pointerTypes || ['mouse', 'pen'],
    cssVarScale: options.cssVarScale || '--framework-dock-scale-js',
    cssVarTranslateY: options.cssVarTranslateY || '--framework-dock-ty-js',
    activeClass: options.activeClass,
    activeBoost: typeof options.activeBoost === 'number' ? options.activeBoost : 0,
  };

  if (!config.itemSelector) {
    return () => {};
  }

  let rafId = 0;
  let cacheRafId = 0;
  let lastEvent = null;
  let cachedMeta = [];
  let cachedCenters = [];
  let activeEls = new Set();
  let observer = null;

  const getItems = () => Array.from(container.querySelectorAll(config.itemSelector));

  const clearEl = (el) => {
    if (!el) return;
    el.style.removeProperty(config.cssVarScale);
    el.style.removeProperty(config.cssVarTranslateY);
    el.style.removeProperty('z-index');
  };

  const clearAll = () => {
    activeEls.forEach((el) => clearEl(el));
    activeEls.clear();
  };

  const buildCache = () => {
    cacheRafId = 0;

    const items = getItems();
    if (!items.length) {
      cachedMeta = [];
      cachedCenters = [];
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const scrollOffset = config.axis === 'y' ? container.scrollTop : container.scrollLeft;

    const meta = items
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const center =
          config.axis === 'y'
            ? rect.top - containerRect.top + scrollOffset + rect.height / 2
            : rect.left - containerRect.left + scrollOffset + rect.width / 2;
        return { el, center };
      })
      .sort((a, b) => a.center - b.center);

    cachedMeta = meta;
    cachedCenters = meta.map((m) => m.center);
  };

  const scheduleBuildCache = () => {
    if (cacheRafId) return;
    cacheRafId = raf(buildCache);
  };

  const update = () => {
    rafId = 0;
    if (!lastEvent) return;

    if (!cachedMeta.length) {
      buildCache();
    }
    if (!cachedMeta.length) return;

    const containerRect = container.getBoundingClientRect();
    const scrollOffset = config.axis === 'y' ? container.scrollTop : container.scrollLeft;
    const pointerCoord =
      config.axis === 'y'
        ? lastEvent.clientY - containerRect.top + scrollOffset
        : lastEvent.clientX - containerRect.left + scrollOffset;

    const nextActive = new Set();

    // 只更新“半径范围内”的邻近元素（降低每帧 style 写入与计算）
    const idx = lowerBound(cachedCenters, pointerCoord);
    const radius = config.radius;

    const applyAmount = (el, amount) => {
      if (!el) return;
      if (amount <= 0) return;
      const scale = config.minScale + amount * (config.maxScale - config.minScale);
      const lift = -amount * config.maxLift;

      el.style.setProperty(config.cssVarScale, scale.toFixed(3));
      el.style.setProperty(config.cssVarTranslateY, `${lift.toFixed(2)}px`);
      el.style.zIndex = String(Math.round(amount * 10));
      nextActive.add(el);
    };

    const applyByDistance = (el, distAbs) => {
      const t = clamp(1 - distAbs / radius, 0, 1);
      const proximity = Math.pow(t, config.falloff);
      const boost = config.activeClass && el?.classList?.contains(config.activeClass) ? config.activeBoost : 0;
      const amount = clamp(Math.max(proximity, boost), 0, 1);
      if (amount <= 0) return;
      applyAmount(el, amount);
    };

    for (let i = idx - 1; i >= 0; i -= 1) {
      const m = cachedMeta[i];
      const distAbs = pointerCoord - m.center;
      if (distAbs > radius) break;
      applyByDistance(m.el, distAbs);
    }

    for (let i = idx; i < cachedMeta.length; i += 1) {
      const m = cachedMeta[i];
      const distAbs = m.center - pointerCoord;
      if (distAbs > radius) break;
      applyByDistance(m.el, distAbs);
    }

    // activeBoost：允许激活项在指针不在附近时也有一个 baseline（用于 TagsView）
    if (config.activeClass && config.activeBoost > 0) {
      const activeEl = container.querySelector(`.${config.activeClass}`);
      if (activeEl && !nextActive.has(activeEl)) {
        applyAmount(activeEl, clamp(config.activeBoost, 0, 1));
      }
    }

    activeEls.forEach((el) => {
      if (!nextActive.has(el)) clearEl(el);
    });
    activeEls = nextActive;
  };

  const scheduleUpdate = () => {
    if (rafId) return;
    rafId = raf(update);
  };

  const shouldHandle = (event) => {
    const type = event?.pointerType;
    if (!type) return true;
    return config.pointerTypes.includes(type);
  };

  const onPointerMove = (event) => {
    if (!shouldHandle(event)) return;
    lastEvent = event;
    scheduleUpdate();
  };

  const onPointerEnter = (event) => {
    if (!shouldHandle(event)) return;
    lastEvent = event;
    scheduleBuildCache();
    scheduleUpdate();
  };

  const onPointerLeave = () => {
    lastEvent = null;
    if (rafId) caf(rafId);
    rafId = 0;
    if (cacheRafId) caf(cacheRafId);
    cacheRafId = 0;
    clearAll();
  };

  container.addEventListener('pointerenter', onPointerEnter);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerleave', onPointerLeave);
  container.addEventListener('pointercancel', onPointerLeave);

  // DOM 结构/展开收起会触发布局变化：监听 class/childList 变更，重建中心点缓存
  if (typeof MutationObserver === 'function') {
    observer = new MutationObserver(() => scheduleBuildCache());
    observer.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  // resize 后中心点需要刷新
  const onResize = () => scheduleBuildCache();
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', onResize);
  }

  return () => {
    container.removeEventListener('pointerenter', onPointerEnter);
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerleave', onPointerLeave);
    container.removeEventListener('pointercancel', onPointerLeave);
    if (observer) observer.disconnect();
    observer = null;
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('resize', onResize);
    }
    onPointerLeave();
  };
};
