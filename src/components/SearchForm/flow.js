/**
 * @file src/components/SearchForm/flow.js
 * @description SearchForm 纯逻辑 helper：统一字段归一化、首行/抽屉分组和回车触发判定，供 SearchForm 组件与测试复用。
 */
export const SEARCH_FORM_DEFAULT_FIELD_SPAN = 6;
export const SEARCH_FORM_DRAWER_FIELD_SPAN = 12;
export const SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN = 24;
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

  let currentSpan = 0;
  let isOverflow = false;

  return fields.reduce(
    (result, field) => {
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
 * 判断当前键盘事件是否应该触发 SearchForm 搜索。
 *
 * @param {{ key?: string, target?: { tagName?: string } }} event 键盘事件对象。
 * @returns {boolean} 为 true 时表示应该执行搜索。
 */
export const shouldTriggerSearchFormEnter = (event) => {
  if (event?.key !== 'Enter') {
    return false;
  }

  if (event?.target?.tagName === 'TEXTAREA') {
    return false;
  }

  return true;
};
