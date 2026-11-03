/**
 * @file src/components/SearchForm/__tests__/index.test.js
 * @description SearchForm 单元测试：字段 name 异常兜底、toolbar-only 模式、Drawer destroyOnHidden 透传等关键行为。
 */
const React = require('react');
const { renderToString } = require('react-dom/server');

let mockDrawerProps = null;
let mockFormPropsList = [];
let mockFormItemPropsList = [];
let mockSelectPropsList = [];

jest.mock('antd', () => {
  const React = require('react');

  const Form = (props) => {
    mockFormPropsList.push(props);
    return React.createElement('form-mock', props, props.children);
  };

  Form.Item = function FormItem(props) {
    mockFormItemPropsList.push(props);
    return React.createElement('form-item-mock', props, props.children);
  };

  const Button = (props) => React.createElement('button-mock', props, props.children);
  const Row = (props) => React.createElement('row-mock', props, props.children);
  const Col = (props) => React.createElement('col-mock', props, props.children);
  const Space = (props) => React.createElement('space-mock', props, props.children);

  const Drawer = (props) => {
    mockDrawerProps = props;
    return React.createElement('drawer-mock', props, props.children);
  };

  const Input = (props) => React.createElement('input-mock', props);
  const Select = (props) => {
    mockSelectPropsList.push(props);
    return React.createElement('select-mock', props);
  };

  const DatePicker = (props) => React.createElement('date-picker-mock', props);
  DatePicker.RangePicker = function RangePicker(props) {
    return React.createElement('range-picker-mock', props);
  };

  return { Form, Button, Row, Col, Space, Drawer, Input, Select, DatePicker };
});

jest.mock('../../AdminDrawer', () => {
  return (props) => {
    mockDrawerProps = props;
    return require('react').createElement('drawer-mock', props, props.children);
  };
});

jest.mock('@ant-design/icons', () => {
  const React = require('react');

  const Icon = () => React.createElement('i');

  return {
    SearchOutlined: Icon,
    ReloadOutlined: Icon,
    UpOutlined: Icon,
    DownOutlined: Icon,
  };
});

jest.mock('../index.less', () => ({}));

describe('SearchForm', () => {
  beforeEach(() => {
    mockDrawerProps = null;
    mockFormPropsList = [];
    mockFormItemPropsList = [];
    mockSelectPropsList = [];
  });

  test('should render toolbar-only when fields is empty and attach provided form instance', () => {
    const SearchForm = require('../index.jsx').default;

    const formInstance = {
      resetFields: jest.fn(),
      validateFields: jest.fn(() => Promise.resolve({})),
    };

    renderToString(
      React.createElement(SearchForm, {
        form: formInstance,
        fields: [],
        onSearch: jest.fn(),
        onReset: jest.fn(),
        toolBarRender: () => [React.createElement('span', { key: 'x' }, 'X')],
      })
    );

    expect(mockFormPropsList.length).toBeGreaterThan(0);
    expect(mockFormPropsList[0].form).toBe(formInstance);
  });

  test('should accept array/empty field name and pass destroyOnHidden to Drawer', () => {
    const SearchForm = require('../index.jsx').default;

    const formInstance = {
      resetFields: jest.fn(),
      validateFields: jest.fn(() => Promise.resolve({})),
    };

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
        toolBarRender: () => null,
      })
    );

    expect(mockFormItemPropsList.some((item) => Array.isArray(item.name))).toBe(true);
    expect(mockDrawerProps).not.toBeNull();
    expect(mockDrawerProps.destroyOnHidden).toBe(false);
  });

  test("should apply embedded variant className when variant='embedded'", () => {
    const SearchForm = require('../index.jsx').default;

    const formInstance = {
      resetFields: jest.fn(),
      validateFields: jest.fn(() => Promise.resolve({})),
    };

    const html = renderToString(
      React.createElement(SearchForm, {
        form: formInstance,
        fields: [],
        onSearch: jest.fn(),
        onReset: jest.fn(),
        toolBarRender: () => [React.createElement('span', { key: 'x' }, 'X')],
        variant: 'embedded',
      })
    );

    expect(html).toContain('search-form--embedded');
  });

  test('should coerce invalid select options to array', () => {
    const SearchForm = require('../index.jsx').default;

    const formInstance = {
      resetFields: jest.fn(),
      validateFields: jest.fn(() => Promise.resolve({})),
    };

    renderToString(
      React.createElement(SearchForm, {
        form: formInstance,
        fields: [{ label: '状态', name: 'status', type: 'select', options: {} }],
        onSearch: jest.fn(),
        onReset: jest.fn(),
        toolBarRender: () => null,
      })
    );

    expect(mockSelectPropsList.length).toBe(1);
    expect(mockSelectPropsList[0].options).toEqual([]);
  });
});
