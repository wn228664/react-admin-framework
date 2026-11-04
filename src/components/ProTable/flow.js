/**
 * 模块职责：收口 ProTable 查询参数、分页默认值以及 localSort 的事件转发判定。
 * request 的拒绝必须保留到 UI；列表适配只规整结构，不把 HTTP 200 或某个业务 code 当成功。
 * 纯函数不读 DOM 或改变表单，便于搜索/重置/分页沿同一合同测试。
 */
// 页容量缺省与 ProTable 主组件共用；重置会回到这一默认值。
/**
 * `PAGE_SIZE_DEFAULT`：表格默认页容量 10，搜索沿用当前容量，重置才恢复此值。
 */
import { PAGE_SIZE_DEFAULT } from '@/constants/common';
// 将调用方已经判定成功的响应转换为 list/total，不能代替服务端业务结果校验。
/**
 * `getRowsTotal`：规整 rows/list 与 data.rows/data.list 等成功列表结构，不代替服务端业务成功判定。
 */
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
  // `safeFormData`：已提交条件的对象快照，非对象回退空对象；不承担字段 schema 或业务结果校验。
  const safeFormData = formData && typeof formData === 'object' ? formData : {};
  // `params`：最终请求参数；条件先合并，current/pageSize 由表格最后固定，重名字段不能劫持分页。
  const params = {
    ...safeFormData,
    current,
    pageSize,
  };

  // 保留拒绝态，交给 useAntdTable 的 latest-wins 生命周期显示错误；失败不伪装为空列表。
  // `response`：宿主 request 已解析的业务成功响应；拒绝原样传播，由 UI 展示失败。
  const response = await request(params);
  // `rows`：共享适配器规整的当前页记录数组；作为 ahooks 的 list 返回，不复制记录对象。
  // `total`：共享适配器转换的记录总数，非分页页数；无有效值时使用其默认 0。
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
  // `paginationParams`：最近请求元组首项的安全对象，包含当前页容量和可能的扩展分页字段。
  const paginationParams = antdTableParams?.[0] && typeof antdTableParams[0] === 'object' ? antdTableParams[0] : {};
  // `pageSize`：刷新时优先沿用最近请求、其次表格配置、最后公共默认的每页条数。
  const pageSize = resolveProTablePageSize({ paginationParams, tablePagination });
  // `nextPagination`：刷新参数的新副本；保留扩展字段但把 current 固定为 1。
  const nextPagination = {
    ...paginationParams,
    current: 1,
    pageSize,
  };
  // `formData`：最近已提交查询，只有缺失时才读取当前 Form；避免把未提交草稿替换查询。
  const formData = antdTableParams?.[1] ?? getFieldsValue();
  // `extra`：最近请求元组第三项的扩展上下文，原样保留给 run，不猜内部业务语义。
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
  // `pageSize`：普通搜索沿用的当前页容量；搜索只复位页码，重置才恢复默认容量。
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
  // `shouldUpdateSortConfig`：动作是否明确为 sort 或缺少 action 但存在有效 field；其它动作不能清空本地排序。
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
  // `objA`：规整后的前次列筛选对象；仅用于结构比较，不修改其数组值。
  const objA = normalizeProTableFilters(previousFilters);
  // `objB`：规整后的本次列筛选对象；与 objA 按全部键逐项浅比较。
  const objB = normalizeProTableFilters(nextFilters);
  // `keys`：两次筛选键的去重并集，确保字段被新增或删除也能识别为变化。
  const keys = Array.from(new Set([...Object.keys(objA), ...Object.keys(objB)]));

  return keys.every((/* `key`：两次筛选键并集中的当前键，缺失值按 undefined 参与比较。 */ key) => {
    // `valueA`：当前键在前次筛选中的值；数组按长度和顺序比较，其它值严格相等。
    const valueA = objA[key];
    // `valueB`：当前键在本次筛选中的值；数组与非数组混用视为变化。
    const valueB = objB[key];

    if (Array.isArray(valueA) || Array.isArray(valueB)) {
      if (!Array.isArray(valueA) || !Array.isArray(valueB)) {
        return false;
      }
      if (valueA.length !== valueB.length) {
        return false;
      }
      return valueA.every(
        (
          /* `item`：前次筛选数组当前项，按严格相等与本次同位置项比较；不做隐式类型转换。 */ item,
          /* `index`：筛选数组的零起始下标；只有长度相等后才读取另一数组同位置。 */ index
        ) => item === valueB[index]
      );
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
  // `isPaginationChangeFallback`：缺少明确 action 时，由有效 current/pageSize 与前次快照比较得到的翻页判断。
  const isPaginationChangeFallback =
    typeof pagination?.current === 'number' &&
    typeof pagination?.pageSize === 'number' &&
    (pagination.current !== prevPagination.current || pagination.pageSize !== prevPagination.pageSize);

  // `isLegacySortFallback`：旧事件缺少 action 但存在 sorter.field 的兼容判断；这种动作不能顺带触发请求。
  const isLegacySortFallback = !action && sortInfo?.field;
  // `isFilterChangeFallback`：无 action 且不属于旧式排序时的筛选变化判断，作为请求转发兜底。
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
    showTotal: (
      /* `total`：Antd 分页提供的当前总记录数，用于展示，不参与请求参数计算。 */ total,
      /* `range`：Antd 分页提供的当前页起止记录序号二元组，空页的具体序号遵循 Antd 行为。 */ range
    ) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
    ...(tablePagination || {}),
    ...(externalPagination || {}),
  };
}

// ───── 模块结束：src/components/ProTable/flow.js ─────
