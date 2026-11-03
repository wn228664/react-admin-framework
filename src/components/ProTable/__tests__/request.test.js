/**
 * @file src/components/ProTable/__tests__/request.test.js
 * @description ProTable request 包装逻辑测试：入参拼接、getRowsTotal 解包与异常兜底。
 */
const React = require('react');
const { renderToString } = require('react-dom/server');

let mockService = null;

jest.mock('ahooks', () => {
  return {
    useAntdTable: jest.fn((service) => {
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
    }),
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

describe('ProTable request wrapper', () => {
  beforeEach(() => {
    mockService = null;
  });

  test('should merge pagination + formData and unwrap rows/total', async () => {
    const ProTable = require('../index.jsx').default;

    const request = jest.fn(async (params) => {
      expect(params).toMatchObject({ current: 2, pageSize: 20, keyword: 'k' });
      return { rows: [{ id: 1 }], total: 9 };
    });

    renderToString(
      React.createElement(ProTable, {
        columns: [],
        request,
        searchFields: [],
      })
    );

    expect(typeof mockService).toBe('function');

    const result = await mockService({ current: 2, pageSize: 20 }, { keyword: 'k' });
    expect(result).toEqual({ total: 9, list: [{ id: 1 }] });
  });

  test('keeps request failure rejected so the UI can offer retry', async () => {
    const ProTable = require('../index.jsx').default;

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
