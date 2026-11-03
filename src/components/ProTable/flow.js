/**
 * @file src/components/ProTable/flow.js
 * @description ProTable 运行时流程 helper：统一 request 包装、分页参数构造、本地排序 onChange 判定和分页配置合并，供 ProTable 主组件复用并补充单测护栏。
 */
import { PAGE_SIZE_DEFAULT } from '@/constants/common';
import { getRowsTotal } from '@/utils/robust';
/**
 * 判断 initialValues 是否为可用于 defaultParams 的有效对象。
 *
 * @param {*} initialValues - 外部传入的初始搜索值。
 * @returns {boolean} 仅当存在非空对象时返回 true。
 */
export function hasProTableInitialValues(initialValues) {
  return Boolean(initialValues && typeof initialValues === 'object' && Object.keys(initialValues).length > 0);
}

/**
 * 执行 ProTable 的 request 包装逻辑：统一合并分页/表单参数，并把常见 rows/total 结构解包成 useAntdTable 需要的 list/total。
 *
 * @param {Object} options - request 执行上下文。
 * @param {Function} options.request - 页面传入的列表请求函数。
 * @param {number} options.current - 当前页码。
 * @param {number} options.pageSize - 当前分页大小。
 * @param {Object} options.formData - 当前搜索表单值。
 * @returns {Promise<{total: number, list: Array}>} useAntdTable 兼容的标准结构。
 */
export async function runProTableRequest({ request, current, pageSize, formData }) {
  const safeFormData = formData && typeof formData === 'object' ? formData : {};
  const params = {
    current,
    pageSize,
    ...safeFormData,
  };

  // 保留拒绝态，交给 useAntdTable 的 latest-wins 生命周期显示错误；失败不伪装为空列表。
  const response = await request(params);
  const { rows, total } = getRowsTotal(response);
  return { total, list: rows };
}

/**
 * 统一读取当前可用 pageSize，优先级与 ProTable 现有 reload/search 逻辑保持一致。
 *
 * @param {Object} options - pageSize 解析上下文。
 * @param {Object} options.paginationParams - useAntdTable 当前 params[0] 的分页对象。
 * @param {Object} options.tablePagination - tableProps.pagination。
 * @returns {number} 本次请求应沿用的 pageSize。
 */
export function resolveProTablePageSize({ paginationParams, tablePagination }) {
  if (typeof paginationParams?.pageSize === 'number') {
    return paginationParams.pageSize;
  }

  if (typeof tablePagination?.pageSize === 'number') {
    return tablePagination.pageSize;
  }

  return PAGE_SIZE_DEFAULT;
}

/**
 * 构造 reload(true) 需要的 run 参数：仅重置 current=1，其余筛选和 extra 保持不变。
 *
 * @param {Object} options - reload 参数上下文。
 * @param {Array} options.antdTableParams - useAntdTable 当前 params。
 * @param {Object} options.tablePagination - tableProps.pagination。
 * @param {Function} options.getFieldsValue - SearchForm 当前表单取值函数。
 * @returns {[Object, Object, any]} 传给 run 的 pagination/formData/extra 三元组。
 */
export function buildReloadRunArguments({ antdTableParams, tablePagination, getFieldsValue }) {
  const paginationParams = antdTableParams?.[0] && typeof antdTableParams[0] === 'object' ? antdTableParams[0] : {};
  const pageSize = resolveProTablePageSize({ paginationParams, tablePagination });
  const nextPagination = {
    ...paginationParams,
    current: 1,
    pageSize,
  };
  const formData = antdTableParams?.[1] ?? getFieldsValue();
  const extra = antdTableParams?.[2];

  return [nextPagination, formData, extra];
}

/**
 * 构造搜索提交时的 run 参数：回到第一页，但沿用当前 pageSize。
 *
 * @param {Object} options - 搜索参数上下文。
 * @param {Object} options.tablePagination - tableProps.pagination。
 * @param {Object} options.values - SearchForm 提交值。
 * @returns {[Object, Object]} 传给 run 的 pagination/formData 二元组。
 */
export function buildSearchRunArguments({ tablePagination, values }) {
  const pageSize = resolveProTablePageSize({ tablePagination });
  return [{ current: 1, pageSize }, values];
}

/**
 * 构造搜索重置时的 run 参数：回到第一页并恢复默认 pageSize。
 *
 * @param {Object} values - resetFields 后的表单值。
 * @returns {[Object, Object]} 传给 run 的 pagination/formData 二元组。
 */
export function buildResetRunArguments(values) {
  return [{ current: 1, pageSize: PAGE_SIZE_DEFAULT }, values];
}

/**
 * 标准化 Table.onChange 传入的 sorter：兼容数组和单对象两种形态。
 *
 * @param {Object|Object[]} sorter - antd Table 的 sorter 参数。
 * @returns {Object|undefined} 标准化后的单个 sorter 对象。
 */
export function normalizeProTableSortInfo(sorter) {
  return Array.isArray(sorter) ? sorter[0] : sorter;
}

/**
 * 根据当前 onChange 动作推导下一次 sortConfig 更新值。
 *
 * @param {Object} options - 排序变更上下文。
 * @param {string} options.action - antd extra.action。
 * @param {Object|undefined} options.sortInfo - 标准化后的 sorter。
 * @returns {Object|null} 返回新 sortConfig；返回 null 代表这次不应更新 sortConfig。
 */
export function buildNextLocalSortConfig({ action, sortInfo }) {
  const shouldUpdateSortConfig = action === 'sort' || (!action && sortInfo?.field);

  if (!shouldUpdateSortConfig) {
    return null;
  }

  if (sortInfo?.field && sortInfo?.order) {
    return { field: sortInfo.field, order: sortInfo.order };
  }

  return {};
}

/**
 * 标准化筛选对象，避免 legacy 场景传入 null/undefined 时污染比较逻辑。
 *
 * @param {*} filters - Table.onChange 的 filters 参数。
 * @returns {Object} 可安全比较和透传的筛选对象。
 */
export function normalizeProTableFilters(filters) {
  return filters && typeof filters === 'object' ? filters : {};
}

/**
 * 比较两次 filters 是否语义等价，兼容数组值。
 *
 * @param {Object} previousFilters - 上一次 filters 快照。
 * @param {Object} nextFilters - 当前 filters 快照。
 * @returns {boolean} 两次 filters 等价时返回 true。
 */
export function areProTableFiltersEqual(previousFilters, nextFilters) {
  const objA = normalizeProTableFilters(previousFilters);
  const objB = normalizeProTableFilters(nextFilters);
  const keys = Array.from(new Set([...Object.keys(objA), ...Object.keys(objB)]));

  return keys.every((key) => {
    const valueA = objA[key];
    const valueB = objB[key];

    if (Array.isArray(valueA) || Array.isArray(valueB)) {
      if (!Array.isArray(valueA) || !Array.isArray(valueB)) {
        return false;
      }
      if (valueA.length !== valueB.length) {
        return false;
      }
      return valueA.every((item, index) => item === valueB[index]);
    }

    return valueA === valueB;
  });
}

/**
 * 判断本地排序模式下，这次 onChange 是否仍应转发给 tableProps.onChange。
 *
 * @param {Object} options - onChange 判定上下文。
 * @param {string} options.action - antd extra.action。
 * @param {Object} options.pagination - 当前分页对象。
 * @param {{current:number, pageSize:number}} options.prevPagination - 上一次已转发的分页快照。
 * @param {Object|undefined} options.sortInfo - 标准化后的 sorter。
 * @param {Object} options.prevFilters - 上一次已转发的 filters 快照。
 * @param {Object} options.nextFilters - 当前 filters 快照。
 * @returns {boolean} true 代表应继续触发请求；false 代表仅做本地排序 UI 更新。
 */
export function shouldForwardLocalSortChange({
  action,
  pagination,
  prevPagination,
  sortInfo,
  prevFilters,
  nextFilters,
}) {
  const isPaginationChangeFallback =
    typeof pagination?.current === 'number' &&
    typeof pagination?.pageSize === 'number' &&
    (pagination.current !== prevPagination.current || pagination.pageSize !== prevPagination.pageSize);

  const isLegacySortFallback = !action && sortInfo?.field;
  const isFilterChangeFallback = !action && !isLegacySortFallback && !areProTableFiltersEqual(prevFilters, nextFilters);

  return (
    action === 'paginate' ||
    action === 'filter' ||
    (!action && !isLegacySortFallback && (isPaginationChangeFallback || isFilterChangeFallback))
  );
}

/**
 * 构造可以安全转发给 tableProps.onChange 的分页对象，兼容 pagination=false 时 antd 传入空对象的场景。
 *
 * @param {Object} options - 分页修正上下文。
 * @param {Object} options.pagination - 当前 onChange 传入的 pagination。
 * @param {{current:number, pageSize:number}} options.prevPagination - 上一次已转发的分页快照。
 * @returns {{current:number, pageSize:number}} 可安全透传的分页对象。
 */
export function buildLocalSortSafePagination({ pagination, prevPagination }) {
  return {
    ...pagination,
    current: typeof pagination?.current === 'number' ? pagination.current : prevPagination.current,
    pageSize: typeof pagination?.pageSize === 'number' ? pagination.pageSize : prevPagination.pageSize,
  };
}

/**
 * 合并 ProTable 分页配置，保持“默认值 -> tableProps.pagination -> 外部 pagination”的优先级不变。
 *
 * @param {Object|false} externalPagination - 组件外部传入的 pagination。
 * @param {Object} tablePagination - useAntdTable 生成的分页配置。
 * @returns {Object|false} 最终传给 antd Table 的 pagination。
 */
export function buildProTablePagination(externalPagination, tablePagination) {
  if (externalPagination === false) {
    return false;
  }

  return {
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
    ...(tablePagination || {}),
    ...(externalPagination || {}),
  };
}
