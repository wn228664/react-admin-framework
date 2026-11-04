/**
 * 模块职责：从真实 ProTable 捕获其交给 useAntdTable 的 service，检查分页/条件合并与响应解包。
 * 静态渲染中替换 UI、搜索和高度 Hook，不访问网络或 DOM；请求失败必须维持拒绝态供 UI 重试。
 * beforeEach 清空 service，防止前例留下回调让未接线组件虚假通过。
 */
// `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
const React = require('react');
// `renderToString`：在 Node 静态渲染受控组件结构；不会执行 effect 或真实 DOM 测量，不能代替浏览器验收。
const { renderToString } = require('react-dom/server');

// `mockService`：当前静态渲染传给 ahooks 的真实 service 回调，初始 null，每例重置后才允许捕获。
let mockService = null;

jest.mock(
  'ahooks',
  /**
   * 替换 useAntdTable 为可观察的固定状态接口，真实 ProTable 继续组装配置；本例不执行 ahooks 网络或生命周期。
   * @returns {Object}
   */ () => {
    return {
      useAntdTable: jest.fn(
        (/* `service`：真实 ProTable 声明的列表包装函数，替身只捕获，不自动调用它产生伪请求。 */ service) => {
          mockService = service;
          return {
            tableProps: {
              dataSource: [],
              loading: false,
              pagination: { current: 1, pageSize: 10, total: 0 },
              onChange: jest.fn(),
            },
            search: { submit: jest.fn(), reset: jest.fn() },
            refresh: jest.fn(),
          };
        }
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

    // `Table`：只返回 table 节点的展示替身，当前测试不读取行/列 DOM 或测量尺寸。
    const Table = () => React.createElement('table');
    // `Card`：只透传 children 的 Card 替身，剥离 Antd portal/样式依赖；不能据此验证视觉或滚动。
    const Card = (/* `props`：Card 替身收到的透传属性，保留 children 以使真实组件子树继续静态渲染。 */ props) =>
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
    const Form = (/* `props`：Form 替身当前属性，原样传 children，useForm 的句柄由同一工厂提供。 */ props) =>
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
      applySorting: (/* `data`：被替换排序 helper 的输入数组，当前请求测试原样返回，不检验排序算法。 */ data) => data,
      buildProcessedColumns: ({ /* `columns`：被替换列适配 helper 的输入列，原样返回以隔离请求行为。 */ columns }) =>
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

describe('ProTable request wrapper', /**
 * 登记本文件表格接线用例，逐例执行真实 ProTable 渲染并断言捕获的公开配置；替身边界不等于浏览器交互。
 * @returns {void}
 */ () => {
  beforeEach(
    /**
     * 清空当前例捕获的表格、表单或服务入口，避免把上例 props/回调误当成当前组件输出。
     * @returns {void}
     */ () => {
      mockService = null;
    }
  );

  /**
   * 从真实组件捕获 service，验证分页与已提交条件合并后正确解包 rows/total。
   * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
   */
  test('should merge pagination + formData and unwrap rows/total', async () => {
    // `ProTable`：此例在 mock 安装后加载的真实表格组件，静态渲染只检查实际参数/回调接线，不运行 DOM 高度观察。
    const ProTable = require('../index.jsx').default;

    // `request`：断言最终 current/pageSize/keyword 的请求替身，返回真实可解包 rows/total 形状。
    const request = jest.fn(
      async (/* `params`：真实 service 合并后交给请求函数的参数，预期分页与关键词同时存在。 */ params) => {
        expect(params).toMatchObject({ current: 2, pageSize: 20, keyword: 'k' });
        return { rows: [{ id: 1 }], total: 9 };
      }
    );

    renderToString(
      React.createElement(ProTable, {
        columns: [],
        request,
        searchFields: [],
      })
    );

    expect(typeof mockService).toBe('function');

    // `result`：调用已捕获 service 后得到的真实适配结果，应为 ahooks 要求的 total/list。
    const result = await mockService({ current: 2, pageSize: 20 }, { keyword: 'k' });
    expect(result).toEqual({ total: 9, list: [{ id: 1 }] });
  });

  /**
   * 真实 service 保留请求拒绝，UI 才能显示错误与重试而非成功空列表。
   * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
   */
  test('keeps request failure rejected so the UI can offer retry', async () => {
    // `ProTable`：此例在 mock 安装后加载的真实表格组件，静态渲染只检查实际参数/回调接线，不运行 DOM 高度观察。
    const ProTable = require('../index.jsx').default;

    // `request`：故意拒绝的请求替身，验证组件包装层不会把错误吞成成功空列表。
    const request = jest.fn(async () => {
      throw new Error('boom');
    });

    renderToString(
      React.createElement(ProTable, {
        columns: [],
        request,
        searchFields: [],
      })
    );

    await expect(mockService({ current: 1, pageSize: 10 }, { keyword: 'k' })).rejects.toThrow('boom');
  });
});

// ───── 模块结束：src/components/ProTable/__tests__/request.test.js ─────
