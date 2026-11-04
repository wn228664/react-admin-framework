/**
 * 模块职责：组合搜索、请求、分页和有界表格正文，供页面或浮层复用同一列表交互。
 * 请求状态由 useAntdTable 持有，搜索草稿由父级 Form 持有；本地排序只重排当前已加载的数据。
 * 失败保留错误和重试入口，不猜业务成功码；表头、搜索和分页固定，正文滚动高度由父容器预算决定。
 */
// Hook 保持表单、排序、请求错误和前次分页快照；memo 只派生视图，不复制接口状态。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 * `useRef`：保存跨渲染 owner、DOM 或任务身份；写 current 不会触发重渲染，清理由配对生命周期负责。
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 * `useCallback`：按依赖保持回调引用供消费者使用；回调中的当前值仍遵循 React 闭包语义。
 * `useMemo`：按声明依赖派生配置/视图，不能作为永不丢失的业务状态或副作用所有者。
 */
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
/** `getMsg`：只选择非空公开文本，异常 message 对象回退默认文案，不能直接作为 React 子节点。 */
import { getMsg } from '@/utils/robust';

// Table/Card 提供固定结构，Form 持有查询草稿，Alert/Button 呈现可恢复请求失败。
/**
 * `Table`：显示当前行、列和分页事件；正文高度由实际父容器预算指定。
 * `Card`：组织固定头部与可收缩正文；本地样式决定正文滚动 owner。
 * `Form`：持有同一份字段草稿和验证规则，SearchForm 与 ProTable 共享实例。
 * `Alert`：显示可恢复的公开请求错误，保留当前重试入口。
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 */
import { Table, Card, Form, Alert, Button } from 'antd';
// useAntdTable 负责查询与分页的最新结果交付；忽略旧结果不等于底层网络已经取消。
/**
 * `useAntdTable`：拥有查询、分页、loading 与最新结果交付；忽略旧结果不等于网络已取消。
 */
import { useAntdTable } from 'ahooks';
// 页容量默认值与 flow 的重置规则共用，避免搜索后分页参数漂移。
/**
 * `PAGE_SIZE_DEFAULT`：表格默认页容量 10，搜索沿用当前容量，重置才恢复此值。
 */
import { PAGE_SIZE_DEFAULT } from '@/constants/common';
// 搜索组件只发布校验后的条件，表格不能再次把草稿当已提交查询。
/**
 * `SearchForm`：按实际容器预算展示搜索字段和高级抽屉，所有字段复用父级 Form。
 */
import SearchForm from '../SearchForm';
// 纯流程函数构造 request 参数并区分排序、分页、筛选动作，测试与 UI 共用这些规则。
/**
 * `buildLocalSortSafePagination`：构造可以安全转发给 tableProps.onChange 的分页对象，兼容 pagination=false 时 antd 传入空对象的场景。
 * `buildNextLocalSortConfig`：根据当前 onChange 动作推导下一次 sortConfig 更新值。
 * `buildProTablePagination`：合并 ProTable 分页配置，保持“默认值 -> tableProps.pagination -> 外部 pagination”的优先级不变。
 * `buildReloadRunArguments`：构造 reload(true) 需要的 run 参数：仅重置 current=1，其余筛选和 extra 保持不变。
 * `buildResetRunArguments`：构造搜索重置时的 run 参数：回到第一页并恢复默认 pageSize。
 * `buildSearchRunArguments`：构造搜索提交时的 run 参数：回到第一页，但沿用当前 pageSize。
 * `hasProTableInitialValues`：判断 initialValues 是否为可用于 defaultParams 的有效对象。
 * `normalizeProTableFilters`：将列筛选规整为可比较对象，null/undefined 为空对象，不猜测业务筛选字段。
 * `normalizeProTableSortInfo`：标准化 Table.onChange 传入的 sorter：兼容数组和单对象两种形态。
 * `runProTableRequest`：执行 ProTable 的 request 包装逻辑：统一合并分页/表单参数，并把常见 rows/total 结构解包成 useAntdTable 需要的 list/total。
 * `shouldForwardLocalSortChange`：判断本地排序模式下，这次 onChange 是否仍应转发给 tableProps.onChange。
 */
import {
  buildLocalSortSafePagination,
  buildNextLocalSortConfig,
  buildProTablePagination,
  buildReloadRunArguments,
  buildResetRunArguments,
  buildSearchRunArguments,
  hasProTableInitialValues,
  normalizeProTableFilters,
  normalizeProTableSortInfo,
  runProTableRequest,
  shouldForwardLocalSortChange,
} from './flow';
// 高度 Hook 读取实际容器和固定区域尺寸，页面/弹窗/抽屉使用同一高度预算。
/**
 * `useTableHeight`：为 Table 提供确定的正文高度与两个挂载 ref。
 */
import useTableHeight from './useTableHeight';
// 排序 helper 按配置派生当前数组顺序，列适配统一拦截无法直接交给 React 的对象值。
/**
 * `applyLocalSorting`：仅重排传入的已加载数据；缺少有效排序配置时直接返回原数组引用。
 * `buildProcessedColumns`：派生列宽、安全默认单元格和右侧操作列；本地 sortOrder 受控且不修改宿主原列。
 */
import { applySorting as applyLocalSorting, buildProcessedColumns } from './utils';
// 表格外壳与搜索/分页不可撑开文档根，横向宽内容在表格内部滚动。
import './index.less';
/**
 * 自适应高度表格组件
 * 支持搜索、分页、自动计算高度、本地排序等能力。
 *
 * @param {Object} props
 * @param {Array} props.columns - antd Table 列配置
 * @param {Function} props.request - 数据请求函数，入参为 {current,pageSize,...formData}
 * @param {Array} props.searchFields - SearchForm 字段配置
 * @param {Function} props.toolBarRender - 工具栏渲染（可返回数组/节点）
 * @param {string|Function} props.rowKey - 行唯一 key（建议稳定且可复现）
 * @param {React.MutableRefObject} props.actionRef - 暴露 {reload(resetPage?),submit,reset,getFieldsValue}
 * @param {Object|false} props.pagination - 分页配置；传 false 禁用分页
 * @param {boolean} props.localSort - 启用本地排序时，排序不会触发请求
 * @param {boolean} props.stripe - 是否启用斑马纹行
 * @param {Array} props.refreshDeps - 依赖变化时自动刷新（可选）
 */
const ProTable = ({
  columns,
  request,
  searchFields,
  toolBarRender,
  rowKey = 'id',
  /* `title`：Card 中可选表格标题节点，计入高度预算，不改变文档标题。 */ title,
  actionRef,
  /* `rowSelection`：Antd 原生行选择配置，选择身份仍由 rowKey 定义；不维护第二份选中状态。 */ rowSelection,
  /* `initialValues`：SearchForm 的初始查询值；有有效字段时同时用于首次请求。 */ initialValues,
  scroll:
    /* `externalScroll`：props.scroll 的本地别名，外部横向预算可保留，正文 y 由实际父容器测量值覆盖。 */ externalScroll,
  localSort = false, // 是否使用本地排序
  pagination:
    /* `externalPagination`：props.pagination 的本地别名；false 完全关闭分页，其余配置与 ahooks 当前分页合并。 */ externalPagination,
  /* `expandable`：Antd 行展开配置；内容应在当前有界表格内展示，不依赖页面滚动。 */ expandable, // 显式提取 expandable
  /* `rowClassName`：宿主行类名文本或 (record,index) 回调，与组件斑马纹共同返回。 */ rowClassName, // 显式提取 rowClassName
  stripe = false, // 是否启用斑马纹行（可选）
  refreshDeps = [], // 外部依赖数组，变化时自动刷新表格（可选）
  .../* `restProps`：其余 Antd Table 透传配置；组件拥有 loading/dataSource/onChange/scroll 等核心字段。 */ restProps
}) => {
  // 前次分页和筛选快照用于识别 localSort 下的真实交互；它们不是额外请求参数来源。
  const prevPaginationRef = useRef({ current: 1, pageSize: PAGE_SIZE_DEFAULT });
  // `prevFiltersRef`：上次已转发的列筛选快照；与新值比较以区分本地排序和真正筛选变化。
  const prevFiltersRef = useRef({});
  // 唯一表单实例由 SearchForm 挂载，避免未连接表单警告及两套草稿状态。
  const [searchForm] = Form.useForm();
  // 当前已加载页的本地排序配置；关闭 localSort 后仍由上游表格请求规则处理。
  // `sortConfig`：当前已加载页的本地 field/order 配置，初始空对象；它不代表服务端全集排序。
  // `setSortConfig`：发布当前页本地排序的 field/order；只作用于已加载数组，不更改后端顺序。
  const [sortConfig, setSortConfig] = useState({});
  // 只保存可展示的最近请求失败，不把失败响应伪装成空数据或成功。
  // `requestError`：当前可展示的请求失败文本，初始空串；新请求开始清空，失败保留重试入口。
  // `setRequestError`：更新公开请求错误文本；每次请求开始清空，失败后保留重试入口。
  const [requestError, setRequestError] = useState('');

  // 检查是否有有效的 initialValues
  // `hasInitialValues`：初始查询对象是否含有效字段；决定 ahooks 首次请求是否使用显式默认参数。
  const hasInitialValues = hasProTableInitialValues(initialValues);

  // 使用 ahooks 的 useAntdTable 处理表格数据
  // `tableProps`：ahooks 的当前数据、loading、分页和事件适配对象；请求状态唯一来源。
  // `search`：ahooks 提供的提交/重置能力，供 actionRef 暴露；搜索组件的显式回调避免重复校验。
  // `refresh`：按当前完整参数重新请求的 ahooks 方法，不重置分页或表单条件。
  // `run`：提交明确分页/条件参数的 ahooks 方法，负责最新结果交付，不承诺取消底层网络。
  // `antdTableParams`：最近请求的参数元组；reload(true) 据此保留查询条件并只回到第一页。
  const {
    tableProps,
    search,
    refresh,
    run,
    params: antdTableParams,
  } = useAntdTable(
    async (
      {
        /* `current`：ahooks 提供的 1 起始页码，传给共享请求适配器。 */ current,
        /* `pageSize`：ahooks 提供的当前每页条数，搜索保留、重置恢复默认。 */ pageSize,
      },
      /* `formData`：此请求已提交的表单条件；共享适配器会固定分页字段，不能被条件覆盖。 */ formData
    ) => {
      return runProTableRequest({ request, current, pageSize, formData });
    },
    {
      defaultPageSize: PAGE_SIZE_DEFAULT,
      onBefore: /**
       * 每次真实查询开始前清空上一条公开失败说明，不提前清空表单或宣告查询成功。
       * @returns {void}
       */ () => setRequestError(''),
      onError: (/* `error`：当前请求拒绝值；优先展示其公开 message，否则使用可重试默认文案。 */ error) =>
        setRequestError(getMsg(error, '加载失败，请重试')),
      form: searchForm,
      // 如果提供了 initialValues，使用 defaultParams 传递初始参数（会自动触发一次搜索）
      // 否则正常初始化（同样会自动触发一次搜索）
      defaultParams: hasInitialValues ? [{ current: 1, pageSize: PAGE_SIZE_DEFAULT }, initialValues] : undefined,
      // 监听外部依赖变化，自动刷新数据（可选功能）
      refreshDeps: refreshDeps.length > 0 ? refreshDeps : undefined,
    }
  );

  /**
   * 刷新当前查询或只把页码复位。
   * @param {boolean} [resetPage=false] true 保留查询条件和页容量但回到第一页；其它值保持全部参数。
   * @returns {void} 请求交由 ahooks 管理；该函数不返回网络完成承诺，也不重置输入草稿。
   */
  const reload = useCallback(
    (/* `resetPage`：只有严格等于 true 才回第一页；默认 false 按原参数 refresh。 */ resetPage = false) => {
      if (resetPage !== true) {
        refresh();
        return;
      }

      // `nextPagination`：刷新到第一页的分页对象，保留最近页容量。
      // `formData`：reload(true) 保留的最近查询条件，缺失时才读取表单。
      // `extra`：最近请求元组中的第三项扩展参数，刷新时原样保留，不重新解释业务字段。
      const [nextPagination, formData, extra] = buildReloadRunArguments({
        antdTableParams,
        tablePagination: { pageSize: tableProps.pagination?.pageSize },
        getFieldsValue: /**
         * 重载参数组装时读取 Form 当前草稿，保留同一表单实例，不复用上一次提交的闭包快照。
         * @returns {Object} 当前表单字段。
         */ () => searchForm.getFieldsValue(),
      });
      run(nextPagination, formData, extra);
    },
    [antdTableParams, refresh, run, searchForm, tableProps.pagination?.pageSize]
  );

  /**
   * 接收 SearchForm 已校验的条件并从第一页请求，避免再次校验和重复提交。
   * @param {Object} values 此次验证成功的字段值，不读取可能继续编辑的表单草稿。
   * @returns {void} 保留当前 pageSize，错误由 useAntdTable.onError 发布。
   */
  const handleSearch = useCallback(
    (/* `values`：SearchForm 单次校验通过的字段快照；搜索从第一页重新查询且保留页容量。 */ values) => {
      // `nextPagination`：搜索后 current=1 且保留当前 pageSize 的分页对象。
      // `formData`：SearchForm 已校验通过的提交值，不再次从未提交草稿覆盖。
      const [nextPagination, formData] = buildSearchRunArguments({
        tablePagination: { pageSize: tableProps.pagination?.pageSize },
        values,
      });
      run(nextPagination, formData);
    },
    [run, tableProps.pagination?.pageSize]
  );

  /**
   * 接收 SearchForm 已完成的重置动作，读取 resetFields 后的条件并回到默认页容量。
   * @returns {void} 请求仍由 ahooks 管理，不把旧的校验草稿再次提交。
   */
  const handleReset = useCallback(() => {
    // resetFields() 已由 SearchForm 执行，这里读取 reset 后的表单值继续触发请求
    // `values`：resetFields 执行后的表单值，遵循字段 initialValue，不混入旧查询。
    const values = searchForm.getFieldsValue();
    // `nextPagination`：重置后的第一页与默认页容量；与搜索只重置页码的规则不同。
    // `formData`：重置后提交的字段值快照，来自已复位表单。
    const [nextPagination, formData] = buildResetRunArguments(values);
    run(nextPagination, formData);
  }, [run, searchForm]);

  /**
   * 将当前数组与本地排序配置交给共享规则，不重新请求远端数据。
   * @param {Object[]} data 已加载的当前页数组。
   * @param {Object} config field/order 当前排序快照。
   * @returns {Object[]} 派生顺序，原数组不被修改。
   */
  const applySorting = useCallback((data, config) => applyLocalSorting(data, config, columns), [columns]);

  // 本地排序数据源（避免通过 useEffect + setState 维护，减少一帧“旧数据/空数据”风险）
  // `localSortedDataSource`：仅在 localSort 开启时派生的当前页排序数组，关闭时留给 ahooks 数据源。
  const localSortedDataSource = useMemo(() => {
    if (!localSort) return undefined;
    // `data`：实际数组形式的当前页数据；数据未就绪时使用空数组，避免排序遍历非数组。
    const data = Array.isArray(tableProps.dataSource) ? tableProps.dataSource : [];
    return applySorting(data, sortConfig);
  }, [localSort, tableProps.dataSource, sortConfig, applySorting]);

  /**
   * 分派 Table 的分页、筛选和排序事件；localSort 的排序动作只更新当前页视图。
   * @param {Object} pagination Antd 当前分页快照，关闭分页时可能为空。
   * @param {Object} filters 列筛选值，只把规整后的快照转发给请求。
   * @param {Object|Object[]} sorter 单列/多列排序信息，由 flow 选择当前有效项。
   * @param {Object} extra action 明确区分 paginate/sort/filter，避免排序误触发请求。
   * @returns {void} 转发分页/筛选时同步更新前次快照，排序不改变后端数据。
   */
  const handleTableChange = (pagination, filters, sorter, extra) => {
    if (localSort) {
      // `sortInfo`：从单列/多列 Antd sorter 中规整的有效排序项，不擅自选择业务字段。
      const sortInfo = normalizeProTableSortInfo(sorter);
      // `safeFilters`：当前列筛选的安全对象快照；空值归空对象，供比较和请求转发共用。
      const safeFilters = normalizeProTableFilters(filters);

      // 本地排序：只在“排序动作”时更新排序配置，避免在分页/筛选动作里 sorter 缺失时误清空。
      // antd Table onChange 第四参 extra.action: 'paginate' | 'sort' | 'filter'
      // `action`：Antd extra.action 的动作类型；sort 只改本地视图，paginate/filter 可以请求。
      const action = extra?.action;
      // `nextSortConfig`：排序动作派生的新 field/order，null 表示本动作不应改动当前本地排序。
      const nextSortConfig = buildNextLocalSortConfig({ action, sortInfo });

      if (nextSortConfig !== null) {
        setSortConfig(nextSortConfig);
      }

      // 本地排序模式：分页/筛选仍交给 tableProps.onChange（会触发请求）；排序不触发请求。
      // 注意：当外部传入 pagination=false 时，antd 可能传入空对象作为 pagination，
      // 这里用 extra.action 判定，避免将排序误判为分页变化而触发无意义请求。
      // `shouldForwardChange`：本次动作是否需要请求的判断值；防止本地排序被误识别为分页。
      const shouldForwardChange = shouldForwardLocalSortChange({
        action,
        pagination,
        prevPagination: prevPaginationRef.current,
        sortInfo,
        prevFilters: prevFiltersRef.current,
        nextFilters: safeFilters,
      });

      if (shouldForwardChange && tableProps.onChange) {
        // `safePagination`：可转发的 current/pageSize，分页关闭或信息缺失时使用前次有效值。
        const safePagination = buildLocalSortSafePagination({
          pagination,
          prevPagination: prevPaginationRef.current,
        });

        prevPaginationRef.current = {
          current: safePagination.current,
          pageSize: safePagination.pageSize,
        };
        prevFiltersRef.current = safeFilters;

        tableProps.onChange(safePagination, safeFilters, sorter, extra);
      }
    } else {
      // 非本地排序，使用原有的表格变更处理
      if (tableProps.onChange) {
        tableProps.onChange(pagination, filters, sorter, extra);
      }
    }
  };

  // 暴露方法给外部调用
  useEffect(() => {
    if (actionRef && typeof actionRef === 'object') {
      actionRef.current = {
        reload, // 刷新表格（可传 true 重置页码）
        submit: search.submit, // 提交搜索
        reset: search.reset, // 重置搜索
        getFieldsValue: () => searchForm.getFieldsValue(), // 获取表单值
      };
      return (
        /**
         * 卸载或公开能力依赖变化时撤回 actionRef，避免父级调用已经释放的表格实例。
         * @returns {void}
         */ () => {
          actionRef.current = null;
        }
      );
    }
    return undefined;
  }, [actionRef, reload, search, searchForm]);

  // 按父组件可用空间分配滚动区
  // `containerRef`：高度 Hook 的有界外容器引用；须挂到外层容器，文档根不承担滚动。
  // `tableRef`：高度 Hook 查询 Card/表头/分页的内部结构引用。
  // `tableHeight`：扣除搜索、表头、分页和 footer 后的正文高度，单位 CSS px，至少 1。
  const { containerRef, tableRef, tableHeight } = useTableHeight({
    dataSource: tableProps.dataSource,
    loading: tableProps.loading,
    hasPagination: externalPagination !== false,
  });

  // 处理操作列，自动将按钮横向排列并用竖线分隔，并固定在右侧最后面
  // 列数组按声明派生，不修改调用方 columns；操作列与默认渲染在共享 helper 中收口。
  // `processedColumns`：按原列顺序派生的渲染配置，统一操作列与安全默认单元格，不改宿主列对象。
  const processedColumns = useMemo(() => {
    return buildProcessedColumns({ columns, localSort, sortConfig });
  }, [columns, localSort, sortConfig]);

  // 只有真实数组才交给 Table，防止外部配置未就绪时在渲染阶段抛错。
  // `safeColumns`：保证交给 Antd 的列配置为数组，配置尚未就绪时使用空数组。
  const safeColumns = useMemo(() => {
    return Array.isArray(processedColumns) ? processedColumns : [];
  }, [processedColumns]);

  /**
   * 组合调用方的 record/index 行样式与可选斑马纹，不覆盖原行类。
   * @param {Object} record 当前记录，原样传给外部 rowClassName。
   * @param {number} index 当前页行下标，从 0 开始。
   * @returns {string} 用空格连接的有效类名。
   */
  const mergedRowClassName = useCallback(
    (record, index) => {
      // `baseClass`：宿主静态或 (record,index) 回调给出的当前行类名，不覆盖其已有样式。
      const baseClass = typeof rowClassName === 'function' ? rowClassName(record, index) : rowClassName;
      // `stripeClass`：当前页奇数下标行的可选斑马纹类，未启用或下标无效时为空。
      const stripeClass = stripe && typeof index === 'number' && index % 2 === 1 ? 'pro-table-row-striped' : '';
      return [baseClass, stripeClass].filter(Boolean).join(' ');
    },
    [rowClassName, stripe]
  );

  return (
    <div className="pro-table-container" ref={containerRef}>
      <div ref={tableRef}>
        <Card className="pro-table-card">
          {/* 搜索表单（集成工具栏） */}
          <SearchForm
            form={searchForm}
            fields={searchFields}
            onSearch={handleSearch}
            onReset={handleReset}
            toolBarRender={toolBarRender}
            initialValues={initialValues}
            variant="embedded"
            loading={Boolean(tableProps.loading)}
          />

          {requestError && (
            <Alert
              type="error"
              showIcon
              message={requestError}
              action={
                <Button
                  size="small"
                  onClick={
                    /**
                     * 用户显式重试时复用 reload 的分页和已提交条件规则，不绕过既有查询 owner。
                     * @returns {void}
                     */ () => reload()
                  }
                >
                  重试
                </Button>
              }
            />
          )}
          {/* 表格标题 */}
          {title && <div className="pro-table-title">{title}</div>}
          {/* 表格 */}
          <Table
            {...(localSort ? {} : tableProps)}
            {...restProps}
            loading={tableProps.loading}
            columns={safeColumns}
            rowKey={rowKey}
            rowSelection={rowSelection}
            dataSource={localSort ? localSortedDataSource : tableProps.dataSource}
            onChange={localSort ? handleTableChange : tableProps.onChange}
            scroll={{
              // 先展开外部传入的 scroll 属性（如果有）
              ...(externalScroll || {}),
              // 确保 y 值始终使用计算出的高度（覆盖外部传入的 y，如果有）
              y: tableHeight,
              // 如果外部没有传入 x，使用 'max-content'
              x: externalScroll?.x !== undefined ? externalScroll.x : 'max-content',
            }}
            pagination={buildProTablePagination(externalPagination, tableProps.pagination)}
            expandable={expandable}
            rowClassName={mergedRowClassName}
          />
        </Card>
      </div>
    </div>
  );
};

export default ProTable;

// ───── 模块结束：src/components/ProTable/index.jsx ─────
