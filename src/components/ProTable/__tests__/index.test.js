/**
 * @file src/components/ProTable/__tests__/index.test.js
 * @description ProTable 初始化行为测试：initialValues 场景下不应开启 manual 模式（否则 refreshDeps 不生效）。
 */
const React = require('react');
const { renderToString } = require('react-dom/server');

let mockSearchFormProps = null;

jest.mock('ahooks', () => {
  return {
    useAntdTable: jest.fn(() => ({
      tableProps: {
        dataSource: [],
        loading: false,
        pagination: { current: 1, pageSize: 10, total: 0 },
        onChange: jest.fn(),
      },
      search: { submit: jest.fn(), reset: jest.fn() },
      refresh: jest.fn(),
      run: jest.fn(),
    })),
  };
});

jest.mock('antd', () => {
  const React = require('react');

  const Table = () => React.createElement('table');
  const Card = (props) => React.createElement('div', props, props.children);

  const formApi = {
    setFieldsValue: jest.fn(),
    getFieldsValue: jest.fn(() => ({})),
    resetFields: jest.fn(),
    validateFields: jest.fn(() => Promise.resolve({})),
  };

  const Form = (props) => React.createElement('form', props, props.children);
  Form.useForm = () => [formApi];

  return { Table, Card, Form };
});

jest.mock('../../SearchForm', () => {
  return (props) => {
    mockSearchFormProps = props;
    return null;
  };
});

jest.mock('../useTableHeight', () => {
  return () => ({
    containerRef: { current: null },
    tableRef: { current: null },
    tableHeight: 300,
  });
});

jest.mock('../utils', () => {
  return {
    applySorting: (data) => data,
    buildProcessedColumns: ({ columns }) => columns,
  };
});

jest.mock('../index.less', () => ({}));

describe('ProTable', () => {
  beforeEach(() => {
    mockSearchFormProps = null;
  });

  test('should pass defaultParams without enabling manual when initialValues provided', () => {
    const ProTable = require('../index.jsx').default;
    const { useAntdTable } = require('ahooks');

    const initialValues = { status: 1 };
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
    const options = useAntdTable.mock.calls[0][1];

    expect(options.defaultParams).toEqual([{ current: 1, pageSize: 10 }, initialValues]);
    expect(options.manual).toBeUndefined();
    expect(options.refreshDeps).toEqual(refreshDeps);
  });

  test('should use run for SearchForm submit and keep/reset pageSize correctly', () => {
    const ProTable = require('../index.jsx').default;
    const { useAntdTable } = require('ahooks');

    const mockRun = jest.fn();
    useAntdTable.mockImplementationOnce(() => ({
      tableProps: {
        dataSource: [],
        loading: false,
        pagination: { current: 2, pageSize: 20, total: 0 },
        onChange: jest.fn(),
      },
      search: { submit: jest.fn(), reset: jest.fn() },
      refresh: jest.fn(),
      run: mockRun,
    }));

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
