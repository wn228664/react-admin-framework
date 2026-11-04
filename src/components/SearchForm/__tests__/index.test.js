/**
 * 模块职责：静态渲染真实搜索表单，检查共享 Form、异常字段名、空字段工具栏、嵌入样式与抽屉配置。
 * 控件替身记录 props 并透传 children，不执行真实表单验证、effect 或 DOM 尺寸监听。
 * 每例清空全部捕获列表；交互取消、Enter 与布局可达性不能由此静态用例替代。
 */
// `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
const React = require('react');
// `renderToString`：在 Node 静态渲染受控组件结构；不会执行 effect 或真实 DOM 测量，不能代替浏览器验收。
const { renderToString } = require('react-dom/server');

// `mockDrawerProps`：当前 AdminDrawer 替身捕获的受控配置，初始 null，用于确认高级区未被错误销毁。
let mockDrawerProps = null;
// `mockFormPropsList`：本例全部 Form 挂载属性的捕获数组，检查工具栏模式也连接父级实例。
let mockFormPropsList = [];
// `mockFormItemPropsList`：本例字段 Form.Item 配置列表，保留数组 name 和空 name 的真实透传。
let mockFormItemPropsList = [];
// `mockSelectPropsList`：本例 Select 收到的配置列表，检查非法 options 在接线前已收窄为空数组。
let mockSelectPropsList = [];

jest.mock(
  'antd',
  /**
   * 提供透传 children 并记录 props 的 Antd 静态替身，真实 SearchForm 继续分配字段和工具栏，不执行平台布局。
   * @returns {Object}
   */ () => {
    // `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
    const React = require('react');

    // `Form`：记录 Form 属性并透传 children 的静态替身，不创建实际 Antd 表单 store。
    const Form = (/* `props`：Form 替身收到的属性，记录 form 引用后继续渲染子树。 */ props) => {
      mockFormPropsList.push(props);
      return React.createElement('form-mock', props, props.children);
    };

    Form.Item = function FormItem(
      /* `props`：Form.Item 替身收到的真实字段配置，记录 name/rules/initialValue 等透传。 */ props
    ) {
      mockFormItemPropsList.push(props);
      return React.createElement('form-item-mock', props, props.children);
    };

    // `Button`：只透传按钮子节点和处理器的展示替身，不执行真实点击或同步互斥。
    const Button = (/* `props`：Button 展示替身属性，保留子节点和事件但不自动触发。 */ props) =>
      React.createElement('button-mock', props, props.children);
    // `Row`：栅格行的静态标签替身，不验证 flex 或断点布局。
    const Row = (/* `props`：Row 替身属性，保留 gutter 和当前子树。 */ props) =>
      React.createElement('row-mock', props, props.children);
    // `Col`：栅格列的静态替身，保留声明属性供子树渲染。
    const Col = (/* `props`：Col 替身属性，保留各断点声明但不执行布局。 */ props) =>
      React.createElement('col-mock', props, props.children);
    // `Space`：间距容器的静态替身，不施加视觉样式。
    const Space = (/* `props`：Space 替身属性，只保留声明节点顺序。 */ props) =>
      React.createElement('space-mock', props, props.children);

    // `Drawer`：Antd Drawer 的占位导出；当前统一 AdminDrawer 另有独立捕获替身。
    const Drawer = (/* `props`：Antd Drawer 占位导出的属性，不作为统一 AdminDrawer 行为证明。 */ props) => {
      mockDrawerProps = props;
      return React.createElement('drawer-mock', props, props.children);
    };

    // `Input`：只接收当前字段配置的静态输入标签，不持有或校验值。
    const Input = (/* `props`：Input 替身的当前字段属性，直接形成静态标签。 */ props) =>
      React.createElement('input-mock', props);
    // `Select`：记录当前下拉控件配置，供 options 兜底断言，不执行真实弹层。
    const Select = (/* `props`：Select 替身实际收到的 options 等配置，先记录再渲染。 */ props) => {
      mockSelectPropsList.push(props);
      return React.createElement('select-mock', props);
    };

    // `DatePicker`：日期控件的命名空间替身，RangePicker 在同一对象上提供。
    const DatePicker = (/* `props`：DatePicker 替身属性，不解析日期或时区。 */ props) =>
      React.createElement('date-picker-mock', props);
    DatePicker.RangePicker = function RangePicker(/* `props`：RangePicker 替身属性，保留真实组件传入的配置。 */ props) {
      return React.createElement('range-picker-mock', props);
    };

    return { Form, Button, Row, Col, Space, Drawer, Input, Select, DatePicker };
  }
);

jest.mock(
  '../../AdminDrawer',
  /**
   * 捕获统一抽屉的实际 open/destroyOnHidden 配置，隔离 portal 与动画，不能把替身当作真实关闭生命周期。
   * @returns {Function}
   */ () => {
    return (/* `props`：统一 AdminDrawer 替身收到的受控配置，记录 open/destroyOnHidden 等字段。 */ props) => {
      mockDrawerProps = props;
      return require('react').createElement('drawer-mock', props, props.children);
    };
  }
);

jest.mock(
  '@ant-design/icons',
  /**
   * 用同一无业务含义的静态图标替换展示导出，避免图标库影响本例字段/工具栏接线。
   * @returns {Object}
   */ () => {
    // `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
    const React = require('react');

    // `Icon`：统一无业务含义的图标占位，避免图标库影响字段接线测试。
    const Icon = () => React.createElement('i');

    return {
      SearchOutlined: Icon,
      ReloadOutlined: Icon,
      UpOutlined: Icon,
      DownOutlined: Icon,
    };
  }
);

jest.mock(
  '../index.less',
  /**
   * 为 Node 隔离搜索表单 LESS 加载；嵌入类名可断言，真实滚动和断点布局仍需浏览器。
   * @returns {Object}
   */ () => ({})
);

describe('SearchForm', /**
 * 登记共享 Form、嵌套字段名、空字段工具栏、抽屉配置和 embedded 变体的真实组件静态渲染用例。
 * @returns {void}
 */ () => {
  beforeEach(
    /**
     * 重置 Drawer/Form/Form.Item/Select 捕获快照，确保每个断言只检查本次真实组件渲染。
     * @returns {void}
     */ () => {
      mockDrawerProps = null;
      mockFormPropsList = [];
      mockFormItemPropsList = [];
      mockSelectPropsList = [];
    }
  );

  /**
   * 没有字段时仍挂载父级 Form 并呈现工具栏，避免未连接实例警告。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should render toolbar-only when fields is empty and attach provided form instance', () => {
    // `SearchForm`：本例在 mock 就绪后加载的真实搜索组件，检查其实际配置而非复制实现。
    const SearchForm = require('../index.jsx').default;

    // `formInstance`：空字段工具栏场景的父级句柄，必须仍挂载到真实 Form。
    const formInstance = {
      resetFields: jest.fn(),
      validateFields: jest.fn(
        /**
         * 兑现空字段校验 Promise，使静态接线用例不引入异步验证失败；真实重复校验/取消另由流程用例与浏览器检查。
         * @returns {Promise<Object>}
         */ () => Promise.resolve({})
      ),
    };

    renderToString(
      React.createElement(SearchForm, {
        form: formInstance,
        fields: [],
        onSearch: jest.fn(),
        onReset: jest.fn(),
        toolBarRender: /**
         * 提供带稳定 key 的自定义工具栏节点，验证没有字段或 embedded 变体也保留父级工具栏。
         * @returns {React.ReactElement[]}
         */ () => [React.createElement('span', { key: 'x' }, 'X')],
      })
    );

    expect(mockFormPropsList.length).toBeGreaterThan(0);
    expect(mockFormPropsList[0].form).toBe(formInstance);
  });

  /**
   * 嵌套/空字段名能安全生成视图，隐藏字段抽屉保持同一表单且不销毁草稿。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should accept array/empty field name and pass destroyOnHidden to Drawer', () => {
    // `SearchForm`：本例在 mock 就绪后加载的真实搜索组件，检查其实际配置而非复制实现。
    const SearchForm = require('../index.jsx').default;

    // `formInstance`：数组/空字段名场景的父级表单句柄，所有字段和高级区应复用它。
    const formInstance = {
      resetFields: jest.fn(),
      validateFields: jest.fn(
        /**
         * 兑现空字段校验 Promise，使静态接线用例不引入异步验证失败；真实重复校验/取消另由流程用例与浏览器检查。
         * @returns {Promise<Object>}
         */ () => Promise.resolve({})
      ),
    };

    // `fields`：包含嵌套 name、空 name、多类型及溢出字段的声明夹具，覆盖字段 key 和高级抽屉接线。
    const fields = [
      { label: 'A', name: ['a', 'b'], type: 'input', span: 6 },
      { label: 'B', name: '', type: 'input', span: 6 },
      { label: 'C', name: 'c', type: 'select', options: [], span: 6 },
      { label: 'D', name: 'd', type: 'dateRange', span: 6 },
      { label: 'E', name: 'e', type: 'input', span: 6 },
    ];

    renderToString(
      React.createElement(SearchForm, {
        form: formInstance,
        fields,
        onSearch: jest.fn(),
        onReset: jest.fn(),
        toolBarRender: /**
         * 明确关闭宿主附加工具栏，使当前字段/下拉配置断言不混入额外节点。
         * @returns {null}
         */ () => null,
      })
    );

    expect(
      mockFormItemPropsList.some((/* `item`：当前捕获的 Form.Item 配置，检查至少一项 name 仍为数组路径。 */ item) =>
        Array.isArray(item.name)
      )
    ).toBe(true);
    expect(mockDrawerProps).not.toBeNull();
    expect(mockDrawerProps.destroyOnHidden).toBe(false);
  });

  /**
   * embedded 变体保留正确根类名，便于 ProTable 统一约束搜索区滚动。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test("should apply embedded variant className when variant='embedded'", () => {
    // `SearchForm`：本例在 mock 就绪后加载的真实搜索组件，检查其实际配置而非复制实现。
    const SearchForm = require('../index.jsx').default;

    // `formInstance`：embedded 样式场景的父级句柄，不需要真实字段存储。
    const formInstance = {
      resetFields: jest.fn(),
      validateFields: jest.fn(
        /**
         * 兑现空字段校验 Promise，使静态接线用例不引入异步验证失败；真实重复校验/取消另由流程用例与浏览器检查。
         * @returns {Promise<Object>}
         */ () => Promise.resolve({})
      ),
    };

    // `html`：真实组件的静态 HTML，用于检查 embedded 根类名，不能证明浏览器实际滚动。
    const html = renderToString(
      React.createElement(SearchForm, {
        form: formInstance,
        fields: [],
        onSearch: jest.fn(),
        onReset: jest.fn(),
        toolBarRender: /**
         * 提供带稳定 key 的自定义工具栏节点，验证没有字段或 embedded 变体也保留父级工具栏。
         * @returns {React.ReactElement[]}
         */ () => [React.createElement('span', { key: 'x' }, 'X')],
        variant: 'embedded',
      })
    );

    expect(html).toContain('search-form--embedded');
  });

  /**
   * 非法 Select.options 在交给控件前规整为空数组，避免下游渲染异常。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should coerce invalid select options to array', () => {
    // `SearchForm`：本例在 mock 就绪后加载的真实搜索组件，检查其实际配置而非复制实现。
    const SearchForm = require('../index.jsx').default;

    // `formInstance`：非法 Select.options 场景的父级句柄，验证配置收窄而非表单提交。
    const formInstance = {
      resetFields: jest.fn(),
      validateFields: jest.fn(
        /**
         * 兑现空字段校验 Promise，使静态接线用例不引入异步验证失败；真实重复校验/取消另由流程用例与浏览器检查。
         * @returns {Promise<Object>}
         */ () => Promise.resolve({})
      ),
    };

    renderToString(
      React.createElement(SearchForm, {
        form: formInstance,
        fields: [{ label: '状态', name: 'status', type: 'select', options: {} }],
        onSearch: jest.fn(),
        onReset: jest.fn(),
        toolBarRender: /**
         * 明确关闭宿主附加工具栏，使当前字段/下拉配置断言不混入额外节点。
         * @returns {null}
         */ () => null,
      })
    );

    expect(mockSelectPropsList.length).toBe(1);
    expect(mockSelectPropsList[0].options).toEqual([]);
  });
});

// ───── 模块结束：src/components/SearchForm/__tests__/index.test.js ─────
