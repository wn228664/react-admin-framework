/**
 * @file src/components/ProTable/__tests__/flow.test.js
 * @description ProTable flow helper 单元测试：覆盖 request 包装、reload/search/reset 参数、本地排序 onChange 判定和分页配置合并。
 */
const {
  areProTableFiltersEqual,
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
} = require('../flow');

describe('ProTable flow helpers', () => {
  test('hasProTableInitialValues should only accept non-empty object', () => {
    expect(hasProTableInitialValues(undefined)).toBe(false);
    expect(hasProTableInitialValues(null)).toBe(false);
    expect(hasProTableInitialValues({})).toBe(false);
    expect(hasProTableInitialValues({ status: 1 })).toBe(true);
  });

  test('runProTableRequest should merge params and unwrap rows/total', async () => {
    const request = jest.fn(async (params) => {
      expect(params).toEqual({ current: 2, pageSize: 20, keyword: 'demo' });
      return { rows: [{ id: 1 }], total: 9 };
    });

    await expect(
      runProTableRequest({
        request,
        current: 2,
        pageSize: 20,
        formData: { keyword: 'demo' },
      })
    ).resolves.toEqual({
      total: 9,
      list: [{ id: 1 }],
    });
  });

  test('runProTableRequest preserves failures', async () => {
    const request = jest.fn(async () => {
      throw new Error('boom');
    });

    await expect(
      runProTableRequest({
        request,
        current: 1,
        pageSize: 10,
        formData: { keyword: 'demo' },
      })
    ).rejects.toThrow('boom');
  });

  test('buildReloadRunArguments should reset current but keep pageSize/formData/extra', () => {
    const getFieldsValue = jest.fn(() => ({ fallback: true }));

    expect(
      buildReloadRunArguments({
        antdTableParams: [{ current: 3, pageSize: 20, sorter: 'x' }, { keyword: 'demo' }, { action: 'filter' }],
        tablePagination: { pageSize: 10 },
        getFieldsValue,
      })
    ).toEqual([{ current: 1, pageSize: 20, sorter: 'x' }, { keyword: 'demo' }, { action: 'filter' }]);

    expect(
      buildReloadRunArguments({
        antdTableParams: undefined,
        tablePagination: { pageSize: 30 },
        getFieldsValue,
      })
    ).toEqual([{ current: 1, pageSize: 30 }, { fallback: true }, undefined]);
  });

  test('buildSearchRunArguments and buildResetRunArguments should keep current semantics', () => {
    expect(buildSearchRunArguments({ tablePagination: { pageSize: 50 }, values: { status: 1 } })).toEqual([
      { current: 1, pageSize: 50 },
      { status: 1 },
    ]);

    expect(buildResetRunArguments({ status: undefined })).toEqual([
      { current: 1, pageSize: 10 },
      { status: undefined },
    ]);
  });

  test('normalizeProTableSortInfo and buildNextLocalSortConfig should preserve localSort semantics', () => {
    expect(normalizeProTableSortInfo([{ field: 'x', order: 'ascend' }])).toEqual({ field: 'x', order: 'ascend' });
    expect(normalizeProTableSortInfo({ field: 'x', order: 'descend' })).toEqual({ field: 'x', order: 'descend' });

    expect(buildNextLocalSortConfig({ action: 'sort', sortInfo: { field: 'x', order: 'ascend' } })).toEqual({
      field: 'x',
      order: 'ascend',
    });
    expect(buildNextLocalSortConfig({ action: 'sort', sortInfo: { field: 'x' } })).toEqual({});
    expect(buildNextLocalSortConfig({ action: undefined, sortInfo: { field: 'x', order: 'descend' } })).toEqual({
      field: 'x',
      order: 'descend',
    });
    expect(buildNextLocalSortConfig({ action: 'filter', sortInfo: { field: 'x', order: 'ascend' } })).toBeNull();
  });

  test('normalizeProTableFilters and areProTableFiltersEqual should handle empty and array values', () => {
    expect(normalizeProTableFilters(undefined)).toEqual({});
    expect(normalizeProTableFilters(null)).toEqual({});
    expect(normalizeProTableFilters({ status: ['1'] })).toEqual({ status: ['1'] });

    expect(areProTableFiltersEqual({ status: ['1'] }, { status: ['1'] })).toBe(true);
    expect(areProTableFiltersEqual({ status: ['1'] }, { status: ['2'] })).toBe(false);
    expect(areProTableFiltersEqual({ keyword: 'a' }, { keyword: 'a' })).toBe(true);
    expect(areProTableFiltersEqual({ keyword: 'a' }, { keyword: 'b' })).toBe(false);
  });

  test('shouldForwardLocalSortChange should match current forward rules', () => {
    const prevPagination = { current: 1, pageSize: 10 };
    const prevFilters = {};
    const nextFilters = { status: ['1'] };

    expect(
      shouldForwardLocalSortChange({
        action: 'sort',
        pagination: { current: 1, pageSize: 10 },
        prevPagination,
        sortInfo: { field: 'x', order: 'ascend' },
        prevFilters,
        nextFilters: prevFilters,
      })
    ).toBe(false);

    expect(
      shouldForwardLocalSortChange({
        action: 'filter',
        pagination: { current: 1, pageSize: 10 },
        prevPagination,
        sortInfo: {},
        prevFilters,
        nextFilters,
      })
    ).toBe(true);

    expect(
      shouldForwardLocalSortChange({
        action: 'paginate',
        pagination: { current: 2, pageSize: 10 },
        prevPagination,
        sortInfo: {},
        prevFilters,
        nextFilters: prevFilters,
      })
    ).toBe(true);

    expect(
      shouldForwardLocalSortChange({
        action: undefined,
        pagination: { current: 1, pageSize: 10 },
        prevPagination,
        sortInfo: { field: 'x', order: 'ascend' },
        prevFilters,
        nextFilters: prevFilters,
      })
    ).toBe(false);

    expect(
      shouldForwardLocalSortChange({
        action: undefined,
        pagination: { current: 1, pageSize: 10 },
        prevPagination,
        sortInfo: undefined,
        prevFilters,
        nextFilters,
      })
    ).toBe(true);
  });

  test('buildLocalSortSafePagination and buildProTablePagination should preserve fallback order', () => {
    expect(
      buildLocalSortSafePagination({
        pagination: {},
        prevPagination: { current: 3, pageSize: 20 },
      })
    ).toEqual({ current: 3, pageSize: 20 });

    const merged = buildProTablePagination(
      { showSizeChanger: false, showTotal: () => 'custom' },
      { current: 2, pageSize: 20, total: 99 }
    );

    expect(merged.current).toBe(2);
    expect(merged.pageSize).toBe(20);
    expect(merged.total).toBe(99);
    expect(merged.showQuickJumper).toBe(true);
    expect(merged.showSizeChanger).toBe(false);
    expect(merged.showTotal(99, [1, 20])).toBe('custom');
    expect(buildProTablePagination(false, { current: 1 })).toBe(false);
  });
});
