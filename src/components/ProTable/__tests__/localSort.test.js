/**
 * 模块职责：通过真实 ProTable 的 onChange 检查本地排序、列筛选、分页及缺少 extra.action 的兼容分派。
 * UI/ahooks 为静态替身，仅观察是否转发请求事件；排序算法和真实表格布局由其它回归覆盖。
 * 每例捕获本轮 Table 配置并清空旧值，避免互相复用错误的事件处理器。
 */
// `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
const React = require('react');
// `renderToString`：在 Node 静态渲染受控组件结构；不会执行 effect 或真实 DOM 测量，不能代替浏览器验收。
const { renderToString } = require('react-dom/server');

// `lastTableProps`：当前 Table 替身捕获的最终受控配置，回调来自本例真实 ProTable。
let lastTableProps = null;

jest.mock(
  'ahooks',
  /**
   * 替换 useAntdTable 为可观察的固定状态接口，真实 ProTable 继续组装配置；本例不执行 ahooks 网络或生命周期。
   * @returns {Object}
   */ () => {
    return {
      useAntdTable: jest.fn(
        /**
         * 返回当前例指定的列表、分页和动作观察器，让真实表格接线可被断言；不会自动执行请求服务。
         * @returns {Object}
         */ () => ({
          tableProps: {
            dataSource: [{ id: 1, x: 1 }],
            loading: false,
            pagination: { current: 1, pageSize: 10, total: 1 },
            onChange: jest.fn(),
          },
          search: { submit: jest.fn(), reset: jest.fn() },
          refresh: jest.fn(),
        })
      ),
    };
  }
);

jest.mock(
  'antd',
  /**
   * 提供静态 Table/Card/Form 和同一表单句柄，使本例聚焦 ProTable 的配置与事件分派，不模拟 Antd DOM 布局。
   * @returns {Object}
   */ () => {
    // `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
    const React = require('react');

    // `Table`：记录真实 props 的静态展示替身，不执行 Antd 自己的排序或分页。
    const Table = (/* `props`：Table 替身收到的最终属性，捕获 localSort 路径使用的包装 onChange。 */ props) => {
      lastTableProps = props;
      return React.createElement('table');
    };

    // `Card`：只透传 children 的 Card 替身，剥离 Antd portal/样式依赖；不能据此验证视觉或滚动。
    const Card = (/* `props`：Card 展示替身属性，只保留子树，不产生布局副作用。 */ props) =>
      React.createElement('div', props, props.children);

    // `formApi`：当前 mock 工厂独有的共享 Form 句柄，查询/校验返回受控空对象，不连接真实表单状态。
    const formApi = {
      setFieldsValue: jest.fn(),
      getFieldsValue: jest.fn(
        /**
         * 返回本例空表单草稿，使默认查询/分页断言不混入额外搜索字段，不创建真实 Form store。
         * @returns {Object}
         */ () => ({})
      ),
      resetFields: jest.fn(),
      validateFields: jest.fn(
        /**
         * 以已兑现 Promise 返回空字段，隔离真实表单校验，使本例只检验表格参数与事件接线。
         * @returns {Promise<Object>}
         */ () => Promise.resolve({})
      ),
    };

    // `Form`：把 children 透传为静态 form 的替身，useForm 固定返回本工厂 formApi，避免创建第二份句柄。
    const Form = (/* `props`：Form 展示替身属性，复用同工厂 formApi。 */ props) =>
      React.createElement('form', props, props.children);
    Form.useForm = /**
     * 向真实组件固定提供同一 formApi，防止静态渲染时生成不同句柄使搜索与表格状态脱节。
     * @returns {Object[]} 单元素表单句柄数组。
     */ () => [formApi];

    return { Table, Card, Form };
  }
);

jest.mock(
  '../../SearchForm',
  /**
   * 隔离搜索表单展示，仅保留本例需要的属性捕获或空节点，搜索校验/焦点由独立组件用例覆盖。
   * @returns {Function}
   */ () => {
    return (
      /**
       * 在当前表格规则测试中不渲染搜索 DOM，防止引入抽屉和尺寸监听等无关副作用。
       * @returns {null}
       */ () => null
    );
  }
);

jest.mock(
  '../useTableHeight',
  /**
   * 用固定高度 Hook 替换真实 DOM 测量，让本例只检验分页、请求或排序配置；实际尺寸另由浏览器验证。
   * @returns {Function}
   */ () => {
    return (
      /**
       * 返回空 DOM 引用和 300 CSS px 正文预算，供静态表格渲染，不据此声称真实短视口适配。
       * @returns {Object}
       */ () => ({
        containerRef: { current: null },
        tableRef: { current: null },
        tableHeight: 300,
      })
    );
  }
);

jest.mock(
  '../utils',
  /**
   * 将排序和列派生替换为输入原样返回的 helper，以隔离当前请求/分页/事件规则；算法本身另有纯逻辑用例。
   * @returns {Object}
   */ () => {
    return {
      applySorting: (/* `data`：当前测试的排序替身输入数组，原样返回以隔离事件分派。 */ data) => data,
      buildProcessedColumns: ({ /* `columns`：当前测试的列适配替身输入，原样返回不改变 sort 配置。 */ columns }) =>
        columns,
    };
  }
);

jest.mock(
  '../index.less',
  /**
   * 为 Node 静态渲染隔离 LESS 加载，当前用例不以空样式模块判断滚动或视觉正确性。
   * @returns {Object}
   */ () => ({})
);

describe('ProTable localSort', /**
 * 登记本文件表格接线用例，逐例执行真实 ProTable 渲染并断言捕获的公开配置；替身边界不等于浏览器交互。
 * @returns {void}
 */ () => {
  beforeEach(
    /**
     * 清空当前例捕获的表格、表单或服务入口，避免把上例 props/回调误当成当前组件输出。
     * @returns {void}
     */ () => {
      lastTableProps = null;
    }
  );

  /**
   * 明确 sort 动作只更新本地顺序，不能转发 ahooks 请求事件。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('sort action should not forward to tableProps.onChange', () => {
    // `ProTable`：此例在 mock 安装后加载的真实表格组件，静态渲染只检查实际参数/回调接线，不运行 DOM 高度观察。
    const ProTable = require('../index.jsx').default;
    // `useAntdTable`：当前测试的 ahooks Hook 替身，用于观察组件转发的配置/事件，不访问网络或证明真实调度行为。
    const { useAntdTable } = require('ahooks');

    renderToString(
      React.createElement(ProTable, {
        columns: [{ title: 'X', dataIndex: 'x', sorter: true }],
        request: jest.fn(),
        searchFields: [],
        localSort: true,
      })
    );

    expect(lastTableProps).toBeTruthy();

    // `tableProps`：本例 ahooks 替身返回的原生表格事件对象，用它确认组件是否正确转发。
    const { tableProps } = useAntdTable.mock.results[0].value;
    // `onChangeSpy`：本例 ahooks 原 onChange 观察者，排序不应调用，分页/筛选应恰好调用一次。
    const onChangeSpy = tableProps.onChange;

    lastTableProps.onChange({ current: 1, pageSize: 10 }, {}, { field: 'x', order: 'ascend' }, { action: 'sort' });

    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  /**
   * 明确 filter 动作转发一次真实筛选快照，保留 action 上下文。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('filter action should forward to tableProps.onChange', () => {
    // `ProTable`：此例在 mock 安装后加载的真实表格组件，静态渲染只检查实际参数/回调接线，不运行 DOM 高度观察。
    const ProTable = require('../index.jsx').default;
    // `useAntdTable`：当前测试的 ahooks Hook 替身，用于观察组件转发的配置/事件，不访问网络或证明真实调度行为。
    const { useAntdTable } = require('ahooks');

    renderToString(
      React.createElement(ProTable, {
        columns: [{ title: 'X', dataIndex: 'x', sorter: true }],
        request: jest.fn(),
        searchFields: [],
        localSort: true,
      })
    );

    expect(lastTableProps).toBeTruthy();

    // `tableProps`：本例 ahooks 替身返回的原生表格事件对象，用它确认组件是否正确转发。
    const { tableProps } = useAntdTable.mock.results[0].value;
    // `onChangeSpy`：本例 ahooks 原 onChange 观察者，排序不应调用，分页/筛选应恰好调用一次。
    const onChangeSpy = tableProps.onChange;

    lastTableProps.onChange({ current: 1, pageSize: 10 }, { status: ['1'] }, {}, { action: 'filter' });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy.mock.calls[0][1]).toEqual({ status: ['1'] });
    expect(onChangeSpy.mock.calls[0][3]).toEqual({ action: 'filter' });
  });

  /**
   * 明确 paginate 动作转发当前页码/页容量和筛选条件一次。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('paginate action should forward to tableProps.onChange', () => {
    // `ProTable`：此例在 mock 安装后加载的真实表格组件，静态渲染只检查实际参数/回调接线，不运行 DOM 高度观察。
    const ProTable = require('../index.jsx').default;
    // `useAntdTable`：当前测试的 ahooks Hook 替身，用于观察组件转发的配置/事件，不访问网络或证明真实调度行为。
    const { useAntdTable } = require('ahooks');

    renderToString(
      React.createElement(ProTable, {
        columns: [{ title: 'X', dataIndex: 'x', sorter: true }],
        request: jest.fn(),
        searchFields: [],
        localSort: true,
      })
    );

    expect(lastTableProps).toBeTruthy();

    // `tableProps`：本例 ahooks 替身返回的原生表格事件对象，用它确认组件是否正确转发。
    const { tableProps } = useAntdTable.mock.results[0].value;
    // `onChangeSpy`：本例 ahooks 原 onChange 观察者，排序不应调用，分页/筛选应恰好调用一次。
    const onChangeSpy = tableProps.onChange;

    lastTableProps.onChange({ current: 2, pageSize: 10 }, { status: ['1'] }, {}, { action: 'paginate' });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy.mock.calls[0][0]).toMatchObject({ current: 2, pageSize: 10 });
    expect(onChangeSpy.mock.calls[0][1]).toEqual({ status: ['1'] });
    expect(onChangeSpy.mock.calls[0][3]).toEqual({ action: 'paginate' });
  });

  /**
   * 没有第四参 action 时仍能由有效分页差异识别翻页，兼容旧签名。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should forward pagination change when extra.action is missing (legacy signature)', () => {
    // `ProTable`：此例在 mock 安装后加载的真实表格组件，静态渲染只检查实际参数/回调接线，不运行 DOM 高度观察。
    const ProTable = require('../index.jsx').default;
    // `useAntdTable`：当前测试的 ahooks Hook 替身，用于观察组件转发的配置/事件，不访问网络或证明真实调度行为。
    const { useAntdTable } = require('ahooks');

    renderToString(
      React.createElement(ProTable, {
        columns: [{ title: 'X', dataIndex: 'x', sorter: true }],
        request: jest.fn(),
        searchFields: [],
        localSort: true,
      })
    );

    expect(lastTableProps).toBeTruthy();

    // `tableProps`：本例 ahooks 替身返回的原生表格事件对象，用它确认组件是否正确转发。
    const { tableProps } = useAntdTable.mock.results[0].value;
    // `onChangeSpy`：本例 ahooks 原 onChange 观察者，排序不应调用，分页/筛选应恰好调用一次。
    const onChangeSpy = tableProps.onChange;

    // 兼容缺少第四参 extra 的事件，仍需按分页/筛选差异正确转发。
    lastTableProps.onChange({ current: 2, pageSize: 10 }, {}, {}, undefined);

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy.mock.calls[0][0]).toMatchObject({ current: 2, pageSize: 10 });
    expect(onChangeSpy.mock.calls[0][3]).toBeUndefined();
  });

  /**
   * 没有 action 且不属于排序时由筛选差异决定转发，避免条件变化被吞。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should forward filter change when extra.action is missing (legacy signature)', () => {
    // `ProTable`：此例在 mock 安装后加载的真实表格组件，静态渲染只检查实际参数/回调接线，不运行 DOM 高度观察。
    const ProTable = require('../index.jsx').default;
    // `useAntdTable`：当前测试的 ahooks Hook 替身，用于观察组件转发的配置/事件，不访问网络或证明真实调度行为。
    const { useAntdTable } = require('ahooks');

    renderToString(
      React.createElement(ProTable, {
        columns: [{ title: 'X', dataIndex: 'x', sorter: true }],
        request: jest.fn(),
        searchFields: [],
        localSort: true,
      })
    );

    expect(lastTableProps).toBeTruthy();

    // `tableProps`：本例 ahooks 替身返回的原生表格事件对象，用它确认组件是否正确转发。
    const { tableProps } = useAntdTable.mock.results[0].value;
    // `onChangeSpy`：本例 ahooks 原 onChange 观察者，排序不应调用，分页/筛选应恰好调用一次。
    const onChangeSpy = tableProps.onChange;

    // 兼容缺少第四参 extra 的事件，仍需按分页/筛选差异正确转发。
    lastTableProps.onChange({ current: 1, pageSize: 10 }, { status: ['1'] }, {}, undefined);

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy.mock.calls[0][1]).toEqual({ status: ['1'] });
    expect(onChangeSpy.mock.calls[0][3]).toBeUndefined();
  });
});

// ───── 模块结束：src/components/ProTable/__tests__/localSort.test.js ─────
