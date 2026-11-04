/**
 * 模块职责：静态渲染真实 ProTable，检查默认分页与外部 pagination 的合并优先级。
 * Table 替身记录最终 props，ahooks 返回固定分页；不验证浏览器分页点击和真实请求调度。
 * 每例先清空捕获对象，防止使用前一次 render 的配置。
 */
// `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
const React = require('react');
// `renderToString`：在 Node 静态渲染受控组件结构；不会执行 effect 或真实 DOM 测量，不能代替浏览器验收。
const { renderToString } = require('react-dom/server');

// `lastTableProps`：当前 Table 替身捕获的最终配置，初始 null，必须来自本例真实组件渲染。
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
            dataSource: [],
            loading: false,
            pagination: { current: 1, pageSize: 10, total: 0 },
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

    // `Table`：记录 props 后返回空 table 的替身，只用于核对分页配置。
    const Table = (/* `props`：Table 收到的真实最终属性，存到 lastTableProps 供分页优先级断言。 */ props) => {
      lastTableProps = props;
      return React.createElement('table');
    };

    // `Card`：只透传 children 的 Card 替身，剥离 Antd portal/样式依赖；不能据此验证视觉或滚动。
    const Card = (/* `props`：Card 展示替身属性，只透传 children，不施加实际样式。 */ props) =>
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
    const Form = (/* `props`：Form 替身属性，保留真实组件声明的子树。 */ props) =>
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
      applySorting: (/* `data`：本例不关注排序，helper 替身原样返回的数据数组。 */ data) => data,
      buildProcessedColumns: ({ /* `columns`：本例不关注列适配，helper 替身原样返回的列数组。 */ columns }) => columns,
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

describe('ProTable pagination merge', /**
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
   * 宿主分页配置覆盖组件默认，但未覆盖的默认项及 ahooks 当前分页仍保留。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should allow external pagination override defaults', () => {
    // `ProTable`：此例在 mock 安装后加载的真实表格组件，静态渲染只检查实际参数/回调接线，不运行 DOM 高度观察。
    const ProTable = require('../index.jsx').default;
    // `customShowTotal`：宿主自定义总数格式函数，检查最终保留同一引用且覆盖组件默认格式。
    const customShowTotal = jest.fn(() => 'custom');

    renderToString(
      React.createElement(ProTable, {
        columns: [],
        request: jest.fn(),
        searchFields: [],
        pagination: {
          showSizeChanger: false,
          showTotal: customShowTotal,
        },
      })
    );

    expect(lastTableProps).toBeTruthy();
    expect(lastTableProps.pagination.showSizeChanger).toBe(false);
    expect(lastTableProps.pagination.showQuickJumper).toBe(true);
    expect(lastTableProps.pagination.showTotal).toBe(customShowTotal);
  });
});

// ───── 模块结束：src/components/ProTable/__tests__/pagination.test.js ─────
