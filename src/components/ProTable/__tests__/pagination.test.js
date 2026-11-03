/**
 * @file src/components/ProTable/__tests__/pagination.test.js
 * @description ProTable 分页配置合并策略测试：组件提供默认值，但允许外部 pagination 覆盖。
 */
const React = require('react');
const { renderToString } = require('react-dom/server');

let lastTableProps = null;

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
    })),
  };
});

jest.mock('antd', () => {
  const React = require('react');

  const Table = (props) => {
    lastTableProps = props;
    return React.createElement('table');
  };

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
  return () => null;
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

describe('ProTable pagination merge', () => {
  beforeEach(() => {
    lastTableProps = null;
  });

  test('should allow external pagination override defaults', () => {
    const ProTable = require('../index.jsx').default;
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
