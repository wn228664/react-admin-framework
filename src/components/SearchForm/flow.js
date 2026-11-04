/**
 * 模块职责：为搜索组件提供字段键、首行栅格分组、控件选项与 Enter 触发条件的纯规则。
 * 这些函数不读取 Form、DOM 或网络；字段和选项来自调用方声明，缺失配置采用可展示的空值。
 * Enter 会避开组合输入、文本域和控件弹层等不应提交的场景，调用方仍负责同步防重复。
 */
// `SEARCH_FORM_DEFAULT_FIELD_SPAN`：普通字段默认占 6/24 栅格，允许 field.span 显式覆盖；与容器预算使用同一单位。
export const SEARCH_FORM_DEFAULT_FIELD_SPAN = 6;
// `SEARCH_FORM_DRAWER_FIELD_SPAN`：高级抽屉字段基础占 12/24 栅格；xs/sm 的响应式覆盖由渲染层负责。
export const SEARCH_FORM_DRAWER_FIELD_SPAN = 12;
// `SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN`：首行默认总预算 24 栅格；窄容器可由组件缩小，超出项不丢弃。
export const SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN = 24;
// `SEARCH_FORM_EMBEDDED_VARIANT`：嵌入 ProTable 的变体名称；仅控制根类名，不能改变搜索协议。
export const SEARCH_FORM_EMBEDDED_VARIANT = 'embedded';
/**
 * 生成 SearchForm 根容器 className。
 *
 * @param {'card'|'embedded'|string|undefined} variant SearchForm UI 变体。
 * @returns {string} 组件根节点 className。
 */
export const getSearchFormContainerClassName = (variant) => {
  if (variant === SEARCH_FORM_EMBEDDED_VARIANT) {
    return 'search-form-container search-form--embedded';
  }
  return 'search-form-container';
};

/**
 * 把字段名归一化为可稳定复用的 React key。
 *
 * @param {string|string[]|number|undefined|null} name 字段名，支持数组嵌套路径。
 * @param {number|string} fallback 当字段名缺失时使用的兜底索引。
 * @returns {string} 稳定 key 字符串。
 */
export const getSearchFormFieldKey = (name, fallback) => {
  if (Array.isArray(name)) return name.join('.');
  if (name === undefined || name === null || name === '') return String(fallback);
  return String(name);
};

/**
 * 把字段按首行展示与高级搜索抽屉拆分。
 *
 * @param {Array<Record<string, any>>} fields 字段配置数组。
 * @param {number} maxVisibleSpan 首行允许占用的最大栅格总宽度。
 * @returns {{ visibleFields: Array<Record<string, any>>, hiddenFields: Array<Record<string, any>> }} 分组结果。
 */
export const splitSearchFormFields = (fields, maxVisibleSpan = SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return { visibleFields: [], hiddenFields: [] };
  }

  // `currentSpan`：本轮分组中首行已占栅格数，初始 0，只在字段成功进入首行时累加。
  let currentSpan = 0;
  // `isOverflow`：首个超预算字段后的连续折叠标志；一旦为 true，后续字段全部进入高级组以保序。
  let isOverflow = false;

  return fields.reduce(
    (
      /* `result`：reduce 的本次分组累加器，仅含新建 visibleFields/hiddenFields 数组，不修改调用方 fields。 */ result,
      /* `field`：按原顺序遍历的当前声明字段；超预算后保留到高级组，不跳过或重排。 */ field
    ) => {
      // `fieldSpan`：当前字段在普通首行模式下的栅格占用；与剩余预算比较，不读 DOM。
      const fieldSpan = getSearchFormFieldSpan(field, false);

      if (!isOverflow && currentSpan + fieldSpan <= maxVisibleSpan) {
        result.visibleFields.push(field);
        currentSpan += fieldSpan;
        return result;
      }

      isOverflow = true;
      result.hiddenFields.push(field);
      return result;
    },
    { visibleFields: [], hiddenFields: [] }
  );
};

/**
 * 读取字段在当前布局下应使用的栅格宽度。
 *
 * @param {Record<string, any>|undefined|null} field 单个字段配置。
 * @param {boolean} isDrawer 当前是否位于高级搜索抽屉。
 * @returns {number} 对应的列跨度。
 */
export const getSearchFormFieldSpan = (field, isDrawer = false) => {
  if (isDrawer) {
    return SEARCH_FORM_DRAWER_FIELD_SPAN;
  }
  return field?.span || SEARCH_FORM_DEFAULT_FIELD_SPAN;
};

/**
 * 判断字段是否应该渲染标签。
 *
 * @param {Record<string, any>|undefined|null} field 单个字段配置。
 * @returns {boolean} 为 true 时保留 label 区域。
 */
export const hasSearchFormFieldLabel = (field) => {
  return field?.label != null && field.label !== '';
};

/**
 * 兜底读取 Select options，避免异常结构直接传给 antd Select。
 *
 * @param {Record<string, any>|undefined|null} field 单个字段配置。
 * @returns {Array<Record<string, any>>} 安全的 options 数组。
 */
export const getSearchFormFieldOptions = (field) => {
  return Array.isArray(field?.options) ? field.options : [];
};

/**
 * 生成“展开更多搜索条件”按钮文案。
 *
 * @param {boolean} drawerVisible 抽屉当前是否展开。
 * @param {number} fieldCount 当前搜索字段总数。
 * @returns {string} 按钮文案。
 */
export const getSearchFormMoreButtonText = (drawerVisible, fieldCount) => {
  if (drawerVisible) {
    return '收起高级搜索';
  }
  return `展开更多搜索条件 (共 ${fieldCount} 项)`;
};

/**
 * 判断本次 Enter 是否允许由搜索表单接管。
 * @param {Object} event 原生或 React 键盘事件；同时检查 nativeEvent 的输入法状态和 229 兼容码。
 * @returns {boolean} 普通未消费的 Enter 才返回 true；输入法、已处理事件、文本域、按钮、选择/日期控件和编辑区均保留自身行为。
 * 此函数只判定，不阻止事件；调用方仍需同步任务锁并在触发搜索时阻止默认/冒泡。
 */
export const shouldTriggerSearchFormEnter = (event) => {
  if (
    event?.key !== 'Enter' ||
    event.defaultPrevented ||
    event.isComposing ||
    event.nativeEvent?.isComposing ||
    event.keyCode === 229 ||
    event.nativeEvent?.keyCode === 229
  ) {
    return false;
  }

  // `target`：键盘事件的实际目标；由原生/React 事件提供，用于排除文本域、编辑区和控件自有 Enter。
  const target = event.target;
  if (
    ['TEXTAREA', 'BUTTON', 'SELECT'].includes(target?.tagName) ||
    target?.isContentEditable ||
    target?.closest?.('.ant-select, .ant-picker, [role="combobox"], [contenteditable="true"]')
  ) {
    return false;
  }

  return true;
};

// ───── 模块结束：src/components/SearchForm/flow.js ─────
