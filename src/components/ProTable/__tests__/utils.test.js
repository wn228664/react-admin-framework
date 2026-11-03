/**
 * @file src/components/ProTable/__tests__/utils.test.js
 * @description ProTable utils 单元测试：列处理（宽度/默认渲染/操作列右侧固定/本地排序标记）与关键兜底行为。
 */
const React = require('react');

jest.mock('antd', () => {
  const React = require('react');

  const Divider = (props) => React.createElement('divider', props);

  const Space = (props) => {
    return React.createElement('space', props, props.children);
  };

  return { Divider, Space };
});

const { buildProcessedColumns, applySorting } = require('../utils');
const { Space } = require('antd');

describe('ProTable utils', () => {
  test('buildProcessedColumns should not mutate input columns', () => {
    const columns = [{ title: '金额', dataIndex: 'amount' }];
    const processed = buildProcessedColumns({ columns, localSort: false });

    expect(Array.isArray(processed)).toBe(true);
    expect(typeof processed[0].render).toBe('function');
    expect(processed[0].width).toBeGreaterThanOrEqual(75);

    // 原始 columns 不应被写入 render/width，避免出现隐式副作用
    expect(columns[0].render).toBeUndefined();
    expect(columns[0].width).toBeUndefined();
  });

  test('default cell render should keep 0 and fallback for empty/object', () => {
    const columns = [{ title: '数量', dataIndex: 'count' }];
    const processed = buildProcessedColumns({ columns, localSort: false });
    const render = processed[0].render;

    expect(render(0)).toBe(0);
    expect(render(null)).toBe('-');
    expect(render(undefined)).toBe('-');
    expect(render('')).toBe('-');
    expect(render(false)).toBe('-');
    expect(render(true)).toBe('是');
    expect(render(NaN)).toBe('-');
    expect(render(Infinity)).toBe('-');
    expect(render({ a: 1 })).toBe('-');
    expect(render([{ a: 1 }])).toBe('-');

    const primitiveArray = ['a', 1, true];
    expect(render(primitiveArray)).toBe(primitiveArray);

    const el = React.createElement('span', null, 'OK');
    expect(render(el)).toBe(el);
    const elementArray = [el];
    expect(render(elementArray)).toBe(elementArray);
  });

  test('should move action column to end and wrap buttons with Space', () => {
    const actionRender = () => [
      React.createElement('a', { key: 'a' }, 'A'),
      React.createElement('a', { key: 'b' }, 'B'),
    ];

    const columns = [
      { title: '名称', dataIndex: 'name' },
      { title: '操作', key: 'action', render: actionRender },
      { title: '状态', dataIndex: 'status' },
    ];

    const processed = buildProcessedColumns({ columns, localSort: false });
    const last = processed[processed.length - 1];

    expect(last.key).toBe('action');
    expect(last.fixed).toBe('right');

    const node = last.render(null, {}, 0);
    expect(React.isValidElement(node)).toBe(true);
    expect(node.type).toBe(Space);
  });

  test('action column detection should support ReactElement title', () => {
    const actionRender = () => [
      React.createElement('a', { key: 'a' }, 'A'),
      React.createElement('a', { key: 'b' }, 'B'),
    ];

    const columns = [
      { title: '名称', dataIndex: 'name' },
      { title: React.createElement('span', null, '操作'), dataIndex: 'op', render: actionRender },
    ];

    const processed = buildProcessedColumns({ columns, localSort: false });
    const last = processed[processed.length - 1];

    expect(last.dataIndex).toBe('op');
    expect(last.fixed).toBe('right');

    const node = last.render(null, {}, 0);
    expect(React.isValidElement(node)).toBe(true);
    expect(node.type).toBe(Space);
  });

  test('applySorting should support array dataIndex (nested fields)', () => {
    const dataIndex = ['a', 'b'];
    const columns = [{ title: '嵌套字段', dataIndex }];

    const data = [
      { id: 1, a: { b: 2 } },
      { id: 2, a: { b: 1 } },
      { id: 3, channelName: '合计', a: { b: 0 } },
    ];

    const sorted = applySorting(data, { field: ['a', 'b'], order: 'ascend' }, columns);
    expect(sorted.map((item) => item.id)).toEqual([2, 1, 3]);
  });

  test('applySorting should not throw when columns is not an array', () => {
    const data = [
      { id: 1, x: 2 },
      { id: 2, x: 1 },
      { id: 3, channelName: '合计', x: 0 },
    ];

    const sorted = applySorting(data, { field: 'x', order: 'ascend' }, null);
    expect(sorted.map((item) => item.id)).toEqual([2, 1, 3]);
  });

  test('localSort should set sorter to true without mutating original', () => {
    const sorter = (a, b) => a.x - b.x;
    const columns = [{ title: 'X', dataIndex: 'x', sorter }];

    const processed = buildProcessedColumns({ columns, localSort: true });

    expect(columns[0].sorter).toBe(sorter);
    expect(processed[0].sorter).toBe(true);
  });

  test('localSort should reflect current sortOrder based on sortConfig', () => {
    const sorter = (a, b) => a.x - b.x;
    const columns = [
      { title: 'X', dataIndex: 'x', sorter },
      { title: 'Y', dataIndex: 'y', sorter: true },
    ];

    const processed = buildProcessedColumns({
      columns,
      localSort: true,
      sortConfig: { field: 'x', order: 'ascend' },
    });

    expect(processed[0].sorter).toBe(true);
    expect(processed[0].sortOrder).toBe('ascend');
    expect(processed[1].sorter).toBe(true);
    expect(processed[1].sortOrder).toBeNull();
  });

  test('localSort should not override explicit sortOrder from columns', () => {
    const columns = [{ title: 'X', dataIndex: 'x', sorter: true, sortOrder: 'descend' }];

    const processed = buildProcessedColumns({
      columns,
      localSort: true,
      sortConfig: { field: 'x', order: 'ascend' },
    });

    expect(processed[0].sortOrder).toBe('descend');
  });
});
