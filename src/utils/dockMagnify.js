/**
 * 模块职责：为菜单和标签提供按指针距离衰减的局部放大/抬升，触摸导航不依赖此效果。
 * 元素中心点缓存与 requestAnimationFrame 限制高频测量/写样式；半径按 CSS 像素且必须为正。
 * 调用方须独占指定 CSS 变量与 z-index，释放函数会移除这些属性、观察者、监听和未执行帧。
 */

/**
 * 把已确认的有限数值夹到给定闭区间，不负责修正 NaN 或颠倒的边界。
 * @param {number} value 原始比例。
 * @param {number} min 下界。
 * @param {number} max 上界，必须不小于 min。
 * @returns {number} 夹取后的比例。
 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * 在升序中心点数组中查找首个不小于指针坐标的位置。
 * @param {number[]} arr 已排序的中心坐标，不在本函数重排。
 * @param {number} value 当前指针在容器内容坐标系中的位置。
 * @returns {number} 插入点可等于数组长度，供左右扫描使用。
 */
const lowerBound = (arr, value) => {
  // `left`：二分查找未决区间左边界，初始 0，返回时是首个不小于目标的位置。
  let left = 0;
  // `right`：二分查找未决区间右开边界，初始数组长度，不访问该边界外的元素。
  let right = arr.length;
  while (left < right) {
    // `mid`：当前未决区间中点下标，比较后至少收缩一侧，避免线性扫描所有元素。
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
    return (
      /**
       * 无有效容器时提供可调用的空清理函数，使调用方仍可按统一 effect 契约释放。
       * @returns {void}
       */ () => {}
    );
  }

  // 系统要求减少动态效果时不创建测量、监听或帧任务；运行中切换另由对应 CSS 媒体规则立即抑制位移。
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  // `raf`：标准帧调度器或 16ms timeout 兼容入口，与 caf 成对释放未执行帧。
  const raf =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (/* `cb`：非 rAF 环境的本次帧回调，按 16ms timeout 执行，句柄仍由 owner 保存。 */ cb) => setTimeout(cb, 16);
  // `caf`：标准帧取消器或 clearTimeout 兼容入口，仅取消本 owner 保存的句柄。
  const caf =
    typeof cancelAnimationFrame === 'function'
      ? cancelAnimationFrame
      : (/* `id`：当前 owner 保存的 timeout 兼容句柄，不清理其它模块的计时器。 */ id) => clearTimeout(id);

  // 仅生成当前容器的动效参数；调用方应提供合法选择器、x/y 轴及有限有序的缩放值。
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
    return (
      /**
       * 缺少条目选择器时不创建任何副作用，返回空清理以保持调用方生命周期接线一致。
       * @returns {void}
       */ () => {}
    );
  }

  // rafId 只调度样式更新，cacheRafId 只调度中心点重建，取消时两者都释放。
  let rafId = 0;
  // `cacheRafId`：中心点重建帧句柄，0 表示无计划；指针离开和 cleanup 时一起取消。
  let cacheRafId = 0;
  // 只保留最近一次有效指针位置，不把所有 move 事件排队。
  let lastEvent = null;
  // 按中心坐标排序的元素/坐标缓存，配套 cachedCenters 用于二分查找影响范围。
  let cachedMeta = [];
  // `cachedCenters`：与 cachedMeta 同顺序的升序中心坐标数组，用于 lowerBound 快速定位影响区。
  let cachedCenters = [];
  // 记录本轮写过样式的元素，下一轮不再命中时主动移除旧效果。
  let activeEls = new Set();
  // 观察 class 与子节点变化以重建缓存；不观察 style，避免自己的写入触发反馈循环。
  let observer = null;

  /**
   * 只在当前容器内解析声明选择器，返回本次 DOM 节点快照。
   * @returns {HTMLElement[]} 非法选择器由调用方配置错误向上传播，不查询其他页面。
   */
  const getItems = () => Array.from(container.querySelectorAll(config.itemSelector));

  /**
   * 移除当前 owner 写入的缩放、抬升和层级样式；不尝试恢复其他 owner 的原值。
   * @param {HTMLElement} el 已参与本轮效果的元素。
   * @returns {void}
   */
  const clearEl = (el) => {
    if (!el) return;
    el.style.removeProperty(config.cssVarScale);
    el.style.removeProperty(config.cssVarTranslateY);
    el.style.removeProperty('z-index');
  };

  /**
   * 对所有已激活元素移除本模块样式并清空集合，指针离开和解绑共用此路径。
   * @returns {void}
   */
  const clearAll = () => {
    activeEls.forEach((/* `el`：上一帧写过样式的元素，离开或 cleanup 时清除本模块独占属性。 */ el) => clearEl(el));
    activeEls.clear();
  };

  /**
   * 读取容器与条目尺寸，转换为内容坐标并按中心点排序，供高频 move 重用。
   * @returns {void} 没有元素时清空两份缓存，不保留已删除节点。
   */
  const buildCache = () => {
    cacheRafId = 0;

    // `items`：当前容器声明选择器命中的 DOM 快照，空列表主动清空两份中心缓存。
    const items = getItems();
    if (!items.length) {
      cachedMeta = [];
      cachedCenters = [];
      return;
    }

    // `containerRect`：缓存重建时容器的视口边框盒，将条目中心转换到容器内容坐标。
    const containerRect = container.getBoundingClientRect();
    // `scrollOffset`：缓存重建时沿 x/y 轴的容器滚动偏移，单位 CSS px。
    const scrollOffset = config.axis === 'y' ? container.scrollTop : container.scrollLeft;

    // `meta`：条目与其内容中心坐标组成并按中心排序的新数组，随后更新两份配套缓存。
    const meta = items
      .map((/* `el`：缓存重建时命中的当前 DOM 条目，只读布局盒并保存中心。 */ el) => {
        // `rect`：当前条目视口边框盒，结合容器边界、滚动偏移和半尺寸求内容中心。
        const rect = el.getBoundingClientRect();
        // `center`：条目沿配置轴的内容中心，单位 CSS px，必须和指针使用同一坐标系。
        const center =
          config.axis === 'y'
            ? rect.top - containerRect.top + scrollOffset + rect.height / 2
            : rect.left - containerRect.left + scrollOffset + rect.width / 2;
        return { el, center };
      })
      .sort(
        (
          /* `a`：中心排序比较的左侧记录，只比较 center，不改变 DOM 顺序。 */ a,
          /* `b`：中心排序比较的右侧记录，确保 cachedMeta 与 cachedCenters 都升序。 */ b
        ) => a.center - b.center
      );

    cachedMeta = meta;
    cachedCenters = meta.map((/* `m`：已排序缓存记录，提取其中心形成二分查找专用数组。 */ m) => m.center);
  };

  /**
   * 同一帧合并重复缓存重建请求，避免每次 Mutation 都强制读取布局。
   * @returns {void}
   */
  const scheduleBuildCache = () => {
    if (cacheRafId) return;
    cacheRafId = raf(buildCache);
  };

  /**
   * 根据最近指针坐标计算影响半径内的元素，写新效果并清理不再活跃的旧元素。
   * @returns {void} 没有有效事件或元素时直接结束，不启动轮询。
   */
  const update = () => {
    rafId = 0;
    if (!lastEvent) return;

    if (!cachedMeta.length) {
      buildCache();
    }
    if (!cachedMeta.length) return;

    // `containerRect`：当前样式更新时的容器视口边界，防止页面位置变化后沿用旧指针基准。
    const containerRect = container.getBoundingClientRect();
    // `scrollOffset`：当前沿配置轴的实时滚动偏移，参与指针内容坐标换算。
    const scrollOffset = config.axis === 'y' ? container.scrollTop : container.scrollLeft;
    // `pointerCoord`：最近有效指针在容器内容坐标中的位置，单位 CSS px。
    const pointerCoord =
      config.axis === 'y'
        ? lastEvent.clientY - containerRect.top + scrollOffset
        : lastEvent.clientX - containerRect.left + scrollOffset;

    // `nextActive`：本帧实际写过效果的元素新集合，用于清理上一帧已离开影响区的元素。
    const nextActive = new Set();

    // 只更新“半径范围内”的邻近元素（降低每帧 style 写入与计算）
    // `idx`：升序中心点中首个不小于指针的位置，左右扫描从它两侧开始。
    const idx = lowerBound(cachedCenters, pointerCoord);
    // `radius`：当前影响半径，单位 CSS px；宿主契约要求为正有限值，超半径即停止扫描。
    const radius = config.radius;

    /**
     * 把已经夹取的强度转成缩放/抬升和局部层级，并登记本轮活跃元素。
     * @param {HTMLElement} el 当前命中元素。
     * @param {number} amount 0..1 的强度，0 不写入。
     * @returns {void}
     */
    const applyAmount = (el, amount) => {
      if (!el) return;
      if (amount <= 0) return;
      // `scale`：按 0..1 强度在 minScale/maxScale 间插值的比例，保留三位小数写 CSS。
      const scale = config.minScale + amount * (config.maxScale - config.minScale);
      // `lift`：向上抬升的负 CSS 像素值，保留两位小数，不改变布局盒尺寸。
      const lift = -amount * config.maxLift;

      el.style.setProperty(config.cssVarScale, scale.toFixed(3));
      el.style.setProperty(config.cssVarTranslateY, `${lift.toFixed(2)}px`);
      el.style.zIndex = String(Math.round(amount * 10));
      nextActive.add(el);
    };

    /**
     * 按绝对距离衰减计算强度，与激活项的基线增强取较大值。
     * @param {HTMLElement} el 当前元素。
     * @param {number} distAbs 与指针的非负内容坐标距离，单位 CSS 像素。
     * @returns {void}
     */
    const applyByDistance = (el, distAbs) => {
      // `t`：距离换算并夹至 0..1 的线性邻近度，半径边界为 0、中心为 1。
      const t = clamp(1 - distAbs / radius, 0, 1);
      // `proximity`：线性邻近度按 falloff 幂次衰减后的强度，越大幂次越集中。
      const proximity = Math.pow(t, config.falloff);
      // `boost`：匹配 activeClass 时的基线增强，否则 0；最终仍限制在 0..1。
      const boost = config.activeClass && el?.classList?.contains(config.activeClass) ? config.activeBoost : 0;
      // `amount`：距离强度和激活基线取较大后夹取的最终强度，非正值不写样式。
      const amount = clamp(Math.max(proximity, boost), 0, 1);
      if (amount <= 0) return;
      applyAmount(el, amount);
    };

    // `i`：从插入点左侧向前扫描的中心缓存下标，超出半径即终止。
    for (let i = idx - 1; i >= 0; i -= 1) {
      // `m`：指针左侧当前条目的 {el,center} 缓存记录。
      const m = cachedMeta[i];
      // `distAbs`：指针减左侧中心的非负距离，单位 CSS px。
      const distAbs = pointerCoord - m.center;
      if (distAbs > radius) break;
      applyByDistance(m.el, distAbs);
    }

    // `i`：从插入点向右扫描的中心缓存下标，不遍历半径以外记录。
    for (let i = idx; i < cachedMeta.length; i += 1) {
      // `m`：指针右侧当前条目的 {el,center} 缓存记录。
      const m = cachedMeta[i];
      // `distAbs`：右侧中心减指针的非负距离，单位 CSS px。
      const distAbs = m.center - pointerCoord;
      if (distAbs > radius) break;
      applyByDistance(m.el, distAbs);
    }

    // activeBoost：允许激活项在指针不在附近时也有一个 baseline（用于 TagsView）
    if (config.activeClass && config.activeBoost > 0) {
      // `activeEl`：当前容器匹配激活类的首项，允许在指针半径以外保留显式基线增强。
      const activeEl = container.querySelector(`.${config.activeClass}`);
      if (activeEl && !nextActive.has(activeEl)) {
        applyAmount(activeEl, clamp(config.activeBoost, 0, 1));
      }
    }

    activeEls.forEach((/* `el`：上一帧活跃元素，本帧没有继续命中时移除旧缩放/抬升/层级。 */ el) => {
      if (!nextActive.has(el)) clearEl(el);
    });
    activeEls = nextActive;
  };

  /**
   * 最多安排一个待执行样式更新帧；新事件只替换 lastEvent。
   * @returns {void}
   */
  const scheduleUpdate = () => {
    if (rafId) return;
    rafId = raf(update);
  };

  /**
   * 按 pointerTypes 白名单决定是否响应，缺少类型的兼容事件沿用允许行为。
   * @param {PointerEvent} event 当前指针事件。
   * @returns {boolean} 触摸类型默认不参与悬停效果。
   */
  const shouldHandle = (event) => {
    // `type`：当前 PointerEvent.pointerType；缺失时兼容允许，touch 默认不在白名单。
    const type = event?.pointerType;
    if (!type) return true;
    return config.pointerTypes.includes(type);
  };

  /**
   * 保存有效指针位置并合并下一帧更新，不在事件频率下直接测量条目。
   * @param {PointerEvent} event 当前容器事件。
   * @returns {void}
   */
  const onPointerMove = (event) => {
    if (!shouldHandle(event)) return;
    lastEvent = event;
    scheduleUpdate();
  };

  /**
   * 进入时重建中心点缓存并安排一次显示更新。
   * @param {PointerEvent} event 当前容器事件。
   * @returns {void}
   */
  const onPointerEnter = (event) => {
    if (!shouldHandle(event)) return;
    lastEvent = event;
    scheduleBuildCache();
    scheduleUpdate();
  };

  /**
   * 撤销指针与两类待执行帧，并清理全部临时效果；pointercancel 也走此入口。
   * @returns {void}
   */
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
    observer = new MutationObserver(
      /**
       * 菜单 class 或子节点变化时只排队重建中心缓存，同一帧重复通知由 scheduleBuildCache 合并。
       * @returns {void}
       */ () => scheduleBuildCache()
    );
    observer.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  /**
   * 窗口尺寸变化只安排一次缓存重建，不逐条同步写样式。
   * @returns {void}
   */
  const onResize = () => scheduleBuildCache();
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', onResize);
  }

  return (
    /**
     * 解绑本容器指针、滚动、尺寸和结构监听，并撤销两个帧任务、清除临时缩放/抬升/层级属性。
     * @returns {void}
     */ () => {
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
    }
  );
};

// ───── 模块结束：src/utils/dockMagnify.js ─────
