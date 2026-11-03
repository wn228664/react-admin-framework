/**
 * @file src/components/ProTable/index.jsx
 * @description 基于 ahooks/useAntdTable 的表格封装：提供搜索、分页、自适应高度、本地排序等能力，并对 request 返回结构做统一解包与兜底。
 */
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Card, Form, Alert, Button } from 'antd';
import { useAntdTable } from 'ahooks';
import { PAGE_SIZE_DEFAULT } from '@/constants/common';
import SearchForm from '../SearchForm';
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
import useTableHeight from './useTableHeight';
import { applySorting as applyLocalSorting, buildProcessedColumns } from './utils';
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
  title,
  actionRef,
  rowSelection,
  initialValues,
  scroll: externalScroll,
  localSort = false, // 是否使用本地排序
  pagination: externalPagination,
  expandable, // 显式提取 expandable
  rowClassName, // 显式提取 rowClassName
  stripe = false, // 是否启用斑马纹行（可选）
  refreshDeps = [], // 外部依赖数组，变化时自动刷新表格（可选）
  ...restProps
}) => {
  const prevPaginationRef = useRef({ current: 1, pageSize: PAGE_SIZE_DEFAULT });
  const prevFiltersRef = useRef({});
  const [searchForm] = Form.useForm();
  const [sortConfig, setSortConfig] = useState({});
  const [requestError, setRequestError] = useState('');

  // 检查是否有有效的 initialValues
  const hasInitialValues = hasProTableInitialValues(initialValues);

  // 使用 ahooks 的 useAntdTable 处理表格数据
  const {
    tableProps,
    search,
    refresh,
    run,
    params: antdTableParams,
  } = useAntdTable(
    async ({ current, pageSize }, formData) => {
      return runProTableRequest({ request, current, pageSize, formData });
    },
    {
      defaultPageSize: PAGE_SIZE_DEFAULT,
      onBefore: () => setRequestError(''),
      onError: (error) => setRequestError(error?.message || '加载失败，请重试'),
      form: searchForm,
      // 如果提供了 initialValues，使用 defaultParams 传递初始参数（会自动触发一次搜索）
      // 否则正常初始化（同样会自动触发一次搜索）
      defaultParams: hasInitialValues ? [{ current: 1, pageSize: PAGE_SIZE_DEFAULT }, initialValues] : undefined,
      // 监听外部依赖变化，自动刷新数据（可选功能）
      refreshDeps: refreshDeps.length > 0 ? refreshDeps : undefined,
    }
  );

  /**
   * 刷新表格：
   * - reload(): 保持当前页码/筛选/排序等状态（等价于 useRequest.refresh）
   * - reload(true): 仅重置页码到 1，保持其它查询条件不变（常用于 Tab 切换）
   */
  const reload = useCallback(
    (resetPage = false) => {
      if (resetPage !== true) {
        refresh();
        return;
      }

      const [nextPagination, formData, extra] = buildReloadRunArguments({
        antdTableParams,
        tablePagination: { pageSize: tableProps.pagination?.pageSize },
        getFieldsValue: () => searchForm.getFieldsValue(),
      });
      run(nextPagination, formData, extra);
    },
    [antdTableParams, refresh, run, searchForm, tableProps.pagination?.pageSize]
  );

  /**
   * SearchForm 会先执行一次 form.validateFields()，因此这里直接用 run 发起请求即可，避免重复校验。
   * 注意：
   * - “搜索”应保留当前 pageSize，仅重置 current=1
   * - “重置”应回到默认 pageSize，并使用 resetFields 后的表单值（遵循 antd 行为）
   */
  const handleSearch = useCallback(
    (values) => {
      const [nextPagination, formData] = buildSearchRunArguments({
        tablePagination: { pageSize: tableProps.pagination?.pageSize },
        values,
      });
      run(nextPagination, formData);
    },
    [run, tableProps.pagination?.pageSize]
  );

  const handleReset = useCallback(() => {
    // resetFields() 已由 SearchForm 执行，这里读取 reset 后的表单值继续触发请求
    const values = searchForm.getFieldsValue();
    const [nextPagination, formData] = buildResetRunArguments(values);
    run(nextPagination, formData);
  }, [run, searchForm]);

  // 执行本地排序的通用方法
  const applySorting = useCallback((data, config) => applyLocalSorting(data, config, columns), [columns]);

  // 本地排序数据源（避免通过 useEffect + setState 维护，减少一帧“旧数据/空数据”风险）
  const localSortedDataSource = useMemo(() => {
    if (!localSort) return undefined;
    const data = Array.isArray(tableProps.dataSource) ? tableProps.dataSource : [];
    return applySorting(data, sortConfig);
  }, [localSort, tableProps.dataSource, sortConfig, applySorting]);

  // 处理表格变化（分页/筛选/排序）
  const handleTableChange = (pagination, filters, sorter, extra) => {
    if (localSort) {
      const sortInfo = normalizeProTableSortInfo(sorter);
      const safeFilters = normalizeProTableFilters(filters);

      // 本地排序：只在“排序动作”时更新排序配置，避免在分页/筛选动作里 sorter 缺失时误清空。
      // antd Table onChange 第四参 extra.action: 'paginate' | 'sort' | 'filter'
      const action = extra?.action;
      const nextSortConfig = buildNextLocalSortConfig({ action, sortInfo });

      if (nextSortConfig !== null) {
        setSortConfig(nextSortConfig);
      }

      // 本地排序模式：分页/筛选仍交给 tableProps.onChange（会触发请求）；排序不触发请求。
      // 注意：当外部传入 pagination=false 时，antd 可能传入空对象作为 pagination，
      // 这里用 extra.action 判定，避免将排序误判为分页变化而触发无意义请求。
      const shouldForwardChange = shouldForwardLocalSortChange({
        action,
        pagination,
        prevPagination: prevPaginationRef.current,
        sortInfo,
        prevFilters: prevFiltersRef.current,
        nextFilters: safeFilters,
      });

      if (shouldForwardChange && tableProps.onChange) {
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
      return () => {
        actionRef.current = null;
      };
    }
    return undefined;
  }, [actionRef, reload, search, searchForm]);

  // 按父组件可用空间分配滚动区
  const { containerRef, tableRef, tableHeight } = useTableHeight({
    dataSource: tableProps.dataSource,
    loading: tableProps.loading,
    hasPagination: externalPagination !== false,
  });

  // 处理操作列，自动将按钮横向排列并用竖线分隔，并固定在右侧最后面
  const processedColumns = useMemo(() => {
    return buildProcessedColumns({ columns, localSort, sortConfig });
  }, [columns, localSort, sortConfig]);

  const safeColumns = useMemo(() => {
    return Array.isArray(processedColumns) ? processedColumns : [];
  }, [processedColumns]);

  const mergedRowClassName = useCallback(
    (record, index) => {
      const baseClass = typeof rowClassName === 'function' ? rowClassName(record, index) : rowClassName;
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
                <Button size="small" onClick={() => reload()}>
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
