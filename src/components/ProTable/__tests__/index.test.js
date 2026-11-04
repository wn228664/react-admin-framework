/**
 * 模块职责：验证真实 ProTable 初始化、初始条件与搜索/重置的 ahooks 参数接线。
 * 静态渲染不会执行 effect；初始参数必须保持自动请求模式，避免 manual 使 refreshDeps 失效。
 * 搜索回调使用已校验值，保留当前 pageSize；重置读取已复位 Form 并恢复公共默认页容量。
 */
// `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
const React = require('react');
// `renderToString`：在 Node 静态渲染受控组件结构；不会执行 effect 或真实 DOM 测量，不能代替浏览器验收。
const { renderToString } = require('react-dom/server');

// `mockSearchFormProps`：当前 SearchForm 替身捕获的接线配置，beforeEach 清空，供手动调用真实 onSearch/onReset。
let mockSearchFormProps = null;

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
            dataSource: [],
            loading: false,
            pagination: { current: 1, pageSize: 10, total: 0 },
            onChange: jest.fn(),
          },
          search: { submit: jest.fn(), reset: jest.fn() },
          refresh: jest.fn(),
          run: jest.fn(),
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

    // `Table`：只渲染静态 table 的占位，不测试 Antd 内部实现。
    const Table = () => React.createElement('table');
    // `Card`：只透传 children 的 Card 替身，剥离 Antd portal/样式依赖；不能据此验证视觉或滚动。
    const Card = (/* `props`：Card 替身透传属性，保留 children 继续执行真实搜索子树渲染。 */ props) =>
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
    const Form = (/* `props`：Form 展示替身属性，与同工厂 useForm 句柄配套。 */ props) =>
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
    return (/* `props`：真实表格传给 SearchForm 的配置，捕获后可调用其提交/重置回调。 */ props) => {
      mockSearchFormProps = props;
      return null;
    };
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
      applySorting: (/* `data`：排序替身接收的已加载数组，本初始化测试原样返回。 */ data) => data,
      buildProcessedColumns: ({ /* `columns`：列适配替身接收的声明数组，本初始化测试不改变它。 */ columns }) => columns,
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

describe('ProTable', /**
 * 登记本文件表格接线用例，逐例执行真实 ProTable 渲染并断言捕获的公开配置；替身边界不等于浏览器交互。
 * @returns {void}
 */ () => {
  beforeEach(
    /**
     * 清空当前例捕获的表格、表单或服务入口，避免把上例 props/回调误当成当前组件输出。
     * @returns {void}
     */ () => {
      mockSearchFormProps = null;
    }
  );

  /**
   * 有初始条件时传入 defaultParams，保持自动请求和 refreshDeps 的真实配置。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should pass defaultParams without enabling manual when initialValues provided', () => {
    // `ProTable`：此例在 mock 安装后加载的真实表格组件，静态渲染只检查实际参数/回调接线，不运行 DOM 高度观察。
    const ProTable = require('../index.jsx').default;
    // `useAntdTable`：当前测试的 ahooks Hook 替身，用于观察组件转发的配置/事件，不访问网络或证明真实调度行为。
    const { useAntdTable } = require('ahooks');

    // `initialValues`：首次提交的中性状态条件，必须同时进入表单和 ahooks defaultParams。
    const initialValues = { status: 1 };
    // `refreshDeps`：明确声明的外部刷新依赖，组件不得因存在初始条件而切成 manual。
    const refreshDeps = ['dep1'];

    renderToString(
      React.createElement(ProTable, {
        columns: [],
        request: jest.fn(),
        searchFields: [],
        initialValues,
        refreshDeps,
      })
    );

    expect(useAntdTable).toHaveBeenCalledTimes(1);
    // `options`：真实 useAntdTable 第一次调用的配置参数，检查 defaultParams/manual/refreshDeps。
    const options = useAntdTable.mock.calls[0][1];

    expect(options.defaultParams).toEqual([{ current: 1, pageSize: 10 }, initialValues]);
    expect(options.manual).toBeUndefined();
    expect(options.refreshDeps).toEqual(refreshDeps);
  });

  /**
   * 已校验搜索保留当前页容量，重置读取复位值并恢复公共默认容量。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should use run for SearchForm submit and keep/reset pageSize correctly', () => {
    // `ProTable`：此例在 mock 安装后加载的真实表格组件，静态渲染只检查实际参数/回调接线，不运行 DOM 高度观察。
    const ProTable = require('../index.jsx').default;
    // `useAntdTable`：当前测试的 ahooks Hook 替身，用于观察组件转发的配置/事件，不访问网络或证明真实调度行为。
    const { useAntdTable } = require('ahooks');

    // `mockRun`：第二例注入的明确参数提交观察者，检查搜索和重置各自的分页规则。
    const mockRun = jest.fn();
    useAntdTable.mockImplementationOnce(
      /**
       * 返回当前例指定的列表、分页和动作观察器，让真实表格接线可被断言；不会自动执行请求服务。
       * @returns {Object}
       */ () => ({
        tableProps: {
          dataSource: [],
          loading: false,
          pagination: { current: 2, pageSize: 20, total: 0 },
          onChange: jest.fn(),
        },
        search: { submit: jest.fn(), reset: jest.fn() },
        refresh: jest.fn(),
        run: mockRun,
      })
    );

    renderToString(
      React.createElement(ProTable, {
        columns: [],
        request: jest.fn(),
        searchFields: [],
      })
    );

    expect(mockSearchFormProps).not.toBeNull();

    mockSearchFormProps.onSearch({ foo: 1 });
    expect(mockRun).toHaveBeenCalledWith({ current: 1, pageSize: 20 }, { foo: 1 });

    mockSearchFormProps.onReset();
    expect(mockRun).toHaveBeenCalledWith({ current: 1, pageSize: 10 }, {});
  });
});

// ───── 模块结束：src/components/ProTable/__tests__/index.test.js ─────
