/**
 * 模块职责：检查真实表格流程 helper 的参数构造、分页所有权、响应拒绝和本地事件转发。
 * 不用 React/DOM 替身，直接锁定 reload/search/reset 与筛选比较的纯规则；业务成功不由状态码猜测。
 * 自定义分页只覆盖展示配置，表单重名 current/pageSize 不得覆盖表格当前分页。
 */
// `areProTableFiltersEqual`：比较两次 filters 是否语义等价，兼容数组值。
// `buildLocalSortSafePagination`：构造可以安全转发给 tableProps.onChange 的分页对象，兼容 pagination=false 时 antd 传入空对象的场景。
// `buildNextLocalSortConfig`：根据当前 onChange 动作推导下一次 sortConfig 更新值。
// `buildProTablePagination`：合并 ProTable 分页配置，保持“默认值 -> tableProps.pagination -> 外部 pagination”的优先级不变。
// `buildReloadRunArguments`：构造 reload(true) 需要的 run 参数：仅重置 current=1，其余筛选和 extra 保持不变。
// `buildResetRunArguments`：构造搜索重置时的 run 参数：回到第一页并恢复默认 pageSize。
// `buildSearchRunArguments`：构造搜索提交时的 run 参数：回到第一页，但沿用当前 pageSize。
// `hasProTableInitialValues`：判断 initialValues 是否为可用于 defaultParams 的有效对象。
// `normalizeProTableFilters`：将列筛选规整为可比较对象，null/undefined 为空对象，不猜测业务筛选字段。
// `normalizeProTableSortInfo`：标准化 Table.onChange 传入的 sorter：兼容数组和单对象两种形态。
// `runProTableRequest`：执行 ProTable 的 request 包装逻辑：统一合并分页/表单参数，并把常见 rows/total 结构解包成 useAntdTable 需要的 list/total。
// `shouldForwardLocalSortChange`：判断本地排序模式下，这次 onChange 是否仍应转发给 tableProps.onChange。
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

describe('ProTable flow helpers', /**
 * 登记分页所有权、搜索重置、响应解包与本地排序事件规则，用纯 helper 断言隔离 UI 测量。
 * @returns {void}
 */ () => {
  /**
   * 默认初始条件只接受非空对象，空值不制造虚假的首次查询参数。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('hasProTableInitialValues should only accept non-empty object', () => {
    expect(hasProTableInitialValues(undefined)).toBe(false);
    expect(hasProTableInitialValues(null)).toBe(false);
    expect(hasProTableInitialValues({})).toBe(false);
    expect(hasProTableInitialValues({ status: 1 })).toBe(true);
  });

  /**
   * 分页与普通条件按协议传入服务，成功结构转换为 ahooks 的 list/total。
   * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
   */
  test('runProTableRequest should merge params and unwrap rows/total', async () => {
    // `request`：成功服务替身，断言分页和关键词合并后返回 rows/total 供真实 helper 解包。
    const request = jest.fn(
      async (
        /* `params`：真实 runProTableRequest 合并后交给服务的参数，检查 current/pageSize/keyword 契约。 */ params
      ) => {
        expect(params).toEqual({ current: 2, pageSize: 20, keyword: 'demo' });
        return { rows: [{ id: 1 }], total: 9 };
      }
    );

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

  /**
   * 服务拒绝必须向外保留，禁止吞错成为空数据成功。
   * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
   */
  test('runProTableRequest preserves failures', async () => {
    // `request`：故意拒绝的服务替身，验证 flow 不吞异常、不伪装成功空列表。
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

  /**
   * 表单的 current/pageSize 重名字段不能覆盖表格实际分页身份。
   * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
   */
  test('submitted fields cannot replace the table-owned pagination', async () => {
    // request：记录最终参数的服务替身；重名表单字段不得把翻页操作变成任意页码/页容量。
    // `request`：分页所有权回归的服务观察者，收到最终参数后返回中性空数据。
    const request = jest.fn(async () => ({ rows: [], total: 0 }));
    await runProTableRequest({
      request,
      current: 3,
      pageSize: 20,
      formData: { current: 99, pageSize: 9999, keyword: 'demo' },
    });
    expect(request).toHaveBeenCalledWith({ current: 3, pageSize: 20, keyword: 'demo' });
  });

  /**
   * reload(true) 只回第一页，保留容量、已提交条件和第三项扩展上下文。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('buildReloadRunArguments should reset current but keep pageSize/formData/extra', () => {
    // `getFieldsValue`：缺少最近已提交条件时的表单读取替身；已有条件则应沿用历史参数。
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

  /**
   * 搜索保留页容量，重置恢复默认容量，两者都从第一页开始。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
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

  /**
   * 单列/多列 sorter 与显式 sort action 规整为本地配置，其它动作不清空排序。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
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

  /**
   * 列筛选对象按完整键集和数组顺序浅比较，空值和结构变化有明确结果。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('normalizeProTableFilters and areProTableFiltersEqual should handle empty and array values', () => {
    expect(normalizeProTableFilters(undefined)).toEqual({});
    expect(normalizeProTableFilters(null)).toEqual({});
    expect(normalizeProTableFilters({ status: ['1'] })).toEqual({ status: ['1'] });

    expect(areProTableFiltersEqual({ status: ['1'] }, { status: ['1'] })).toBe(true);
    expect(areProTableFiltersEqual({ status: ['1'] }, { status: ['2'] })).toBe(false);
    expect(areProTableFiltersEqual({ keyword: 'a' }, { keyword: 'a' })).toBe(true);
    expect(areProTableFiltersEqual({ keyword: 'a' }, { keyword: 'b' })).toBe(false);
  });

  /**
   * 排序、分页、筛选及缺 action 的兼容事件分别沿正确请求分支执行。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('shouldForwardLocalSortChange should match current forward rules', () => {
    // `prevPagination`：前次已转发的第一页/10 条快照，作为旧事件缺少 action 的比较基准。
    const prevPagination = { current: 1, pageSize: 10 };
    // `prevFilters`：前次无筛选的空快照，新筛选必须识别变化。
    const prevFilters = {};
    // `nextFilters`：当前新增 status 筛选的对象，用于区别筛选变化与本地排序。
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

  /**
   * 缺失分页字段沿前次快照，展示配置按默认/ahooks/宿主顺序合并，false 关闭分页。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('buildLocalSortSafePagination and buildProTablePagination should preserve fallback order', () => {
    expect(
      buildLocalSortSafePagination({
        pagination: {},
        prevPagination: { current: 3, pageSize: 20 },
      })
    ).toEqual({ current: 3, pageSize: 20 });

    // `merged`：真实分页合并结果，检查默认值、ahooks 当前分页和宿主覆盖的优先级。
    const merged = buildProTablePagination(
      {
        showSizeChanger: false,
        showTotal: /**
         * 提供宿主自定义总数文案，验证分页合并保留宿主回调而不会被默认 showTotal 覆盖。
         * @returns {string} 固定 custom。
         */ () => 'custom',
      },
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

// ───── 模块结束：src/components/ProTable/__tests__/flow.test.js ─────
