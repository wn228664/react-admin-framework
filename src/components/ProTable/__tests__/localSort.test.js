/**
 * @file src/components/ProTable/__tests__/localSort.test.js
 * @description ProTable 本地排序行为测试：排序不应触发请求（onChange 转发），分页/筛选仍应触发请求。
 */
const React = require('react');
const { renderToString } = require('react-dom/server');

let lastTableProps = null;

jest.mock('ahooks', () => {
  return {
    useAntdTable: jest.fn(() => ({
      tableProps: {
        dataSource: [{ id: 1, x: 1 }],
        loading: false,
        pagination: { current: 1, pageSize: 10, total: 1 },
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

describe('ProTable localSort', () => {
  beforeEach(() => {
    lastTableProps = null;
  });

  test('sort action should not forward to tableProps.onChange', () => {
    const ProTable = require('../index.jsx').default;
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

    const { tableProps } = useAntdTable.mock.results[0].value;
    const onChangeSpy = tableProps.onChange;

    lastTableProps.onChange({ current: 1, pageSize: 10 }, {}, { field: 'x', order: 'ascend' }, { action: 'sort' });

    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  test('filter action should forward to tableProps.onChange', () => {
    const ProTable = require('../index.jsx').default;
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

    const { tableProps } = useAntdTable.mock.results[0].value;
    const onChangeSpy = tableProps.onChange;

    lastTableProps.onChange({ current: 1, pageSize: 10 }, { status: ['1'] }, {}, { action: 'filter' });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy.mock.calls[0][1]).toEqual({ status: ['1'] });
    expect(onChangeSpy.mock.calls[0][3]).toEqual({ action: 'filter' });
  });

  test('paginate action should forward to tableProps.onChange', () => {
    const ProTable = require('../index.jsx').default;
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

    const { tableProps } = useAntdTable.mock.results[0].value;
    const onChangeSpy = tableProps.onChange;

    lastTableProps.onChange({ current: 2, pageSize: 10 }, { status: ['1'] }, {}, { action: 'paginate' });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy.mock.calls[0][0]).toMatchObject({ current: 2, pageSize: 10 });
    expect(onChangeSpy.mock.calls[0][1]).toEqual({ status: ['1'] });
    expect(onChangeSpy.mock.calls[0][3]).toEqual({ action: 'paginate' });
  });

  test('should forward pagination change when extra.action is missing (legacy signature)', () => {
    const ProTable = require('../index.jsx').default;
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

    const { tableProps } = useAntdTable.mock.results[0].value;
    const onChangeSpy = tableProps.onChange;

    // legacy: no 4th param extra
    lastTableProps.onChange({ current: 2, pageSize: 10 }, {}, {}, undefined);

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy.mock.calls[0][0]).toMatchObject({ current: 2, pageSize: 10 });
    expect(onChangeSpy.mock.calls[0][3]).toBeUndefined();
  });

  test('should forward filter change when extra.action is missing (legacy signature)', () => {
    const ProTable = require('../index.jsx').default;
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

    const { tableProps } = useAntdTable.mock.results[0].value;
    const onChangeSpy = tableProps.onChange;

    // legacy: no 4th param extra
    lastTableProps.onChange({ current: 1, pageSize: 10 }, { status: ['1'] }, {}, undefined);

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy.mock.calls[0][1]).toEqual({ status: ['1'] });
    expect(onChangeSpy.mock.calls[0][3]).toBeUndefined();
  });
});
