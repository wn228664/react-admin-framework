/**
 * 模块职责：直接调用真实列适配和排序函数，验证不可变性、安全默认单元格、操作列与受控排序配置。
 * React/Space/Divider 为可识别静态节点，不验证 Antd 实际布局；对象值不得直接导致 React 渲染失败。
 * 合计形状字段仅作为禁止业务特判的回归夹具，排序必须遵循声明字段，不在生产框架识别它。
 */
// `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
const React = require('react');

jest.mock(
  'antd',
  /**
   * 提供静态 Divider/Tooltip 替身供操作列结构渲染，不替换本文件实际待测的列派生与排序 helper。
   * @returns {Object}
   */ () => {
    // `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
    const React = require('react');

    // `Divider`：静态分隔节点替身，仅供检查操作列包装结构，不施加真实样式。
    const Divider = (/* `props`：Divider 替身配置，只生成可识别静态节点，不执行样式。 */ props) =>
      React.createElement('divider', props);

    // `Space`：当前测试的 Space 节点替身，提供稳定组件身份与 children 供操作列包装断言，视觉间距另由运行态验收。
    const Space = (/* `props`：Space 替身配置，保留其 children 供操作节点结构断言。 */ props) => {
      return React.createElement('space', props, props.children);
    };

    return { Divider, Space };
  }
);

// `buildProcessedColumns`：派生列宽、安全默认单元格和右侧操作列；本地 sortOrder 受控且不修改宿主原列。
// `applySorting`：仅重排传入的已加载数据；缺少有效排序配置时直接返回原数组引用。
const { buildProcessedColumns, applySorting } = require('../utils');
// `Space`：当前测试的 Space 节点替身，提供稳定组件身份与 children 供操作列包装断言，视觉间距另由运行态验收。
const { Space } = require('antd');

describe('ProTable utils', /**
 * 登记列配置不变性、显式操作 render 与本地排序规则；不会向真实后端请求数据。
 * @returns {void}
 */ () => {
  /**
   * 列派生补 width/render 但不回写原列，防止调用方共享配置被隐式改变。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('buildProcessedColumns should not mutate input columns', () => {
    // `columns`：没有 width/render 的原列声明，检查派生过程不回写输入。
    const columns = [{ title: '金额', dataIndex: 'amount' }];
    // `processed`：真实列适配结果，必须是新配置并补有效宽度和安全 render。
    const processed = buildProcessedColumns({ columns, localSort: false });

    expect(Array.isArray(processed)).toBe(true);
    expect(typeof processed[0].render).toBe('function');
    expect(processed[0].width).toBeGreaterThanOrEqual(75);

    // 原始 columns 不应被写入 render/width，避免出现隐式副作用
    expect(columns[0].render).toBeUndefined();
    expect(columns[0].width).toBeUndefined();
  });

  /**
   * 默认单元格保留 0/有效 React 节点，空值、非法数和普通对象使用安全占位。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('default cell render should keep 0 and fallback for empty/object', () => {
    // `columns`：默认单元格测试的单列声明，只提供字段身份，不带自定义 render。
    const columns = [{ title: '数量', dataIndex: 'count' }];
    // `processed`：从该单列派生的结果，取默认 render 覆盖空值、对象和 React 元素边界。
    const processed = buildProcessedColumns({ columns, localSort: false });
    // `render`：真实默认单元格函数，必须保留 0/有效节点，异常形状只展示占位。
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

    // `primitiveArray`：React 可直接渲染的基础值数组，预期沿用原引用，不错误当成普通对象。
    const primitiveArray = ['a', 1, true];
    expect(render(primitiveArray)).toBe(primitiveArray);

    // `el`：已构造的安全 span 元素，默认渲染必须原样保留而非字符串化。
    const el = React.createElement('span', null, 'OK');
    expect(render(el)).toBe(el);
    // `elementArray`：只含有效 React 元素的数组，预期完整保留。
    const elementArray = [el];
    expect(render(elementArray)).toBe(elementArray);
  });

  /**
   * 中间操作列移至最右并包装 Space，宿主动作节点仍可完整保留。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should move action column to end and wrap buttons with Space', () => {
    // `actionRender`：返回两个宿主动作节点的渲染替身，测试通用 Space 包装不吞节点。
    const actionRender = () => [
      React.createElement('a', { key: 'a' }, 'A'),
      React.createElement('a', { key: 'b' }, 'B'),
    ];

    // `columns`：操作列位于中间的三列声明，检查只把操作列移到末尾，保留其它顺序。
    const columns = [
      { title: '名称', dataIndex: 'name' },
      { title: '操作', key: 'action', render: actionRender },
      { title: '状态', dataIndex: 'status' },
    ];

    // `processed`：完成操作列定位和包装的新列数组，不修改原声明。
    const processed = buildProcessedColumns({ columns, localSort: false });
    // `last`：派生数组最后一列，应为固定在 right 的原操作列。
    const last = processed[processed.length - 1];

    expect(last.key).toBe('action');
    expect(last.fixed).toBe('right');

    // `node`：调用包装后的操作 render 得到的真实节点，应以 Space 组织宿主动作。
    const node = last.render(null, {}, 0);
    expect(React.isValidElement(node)).toBe(true);
    expect(node.type).toBe(Space);
  });

  /**
   * 操作标题为 ReactElement 时静态读取已有子文本，不能执行组件或漏掉操作列。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('action column detection should support ReactElement title', () => {
    // `actionRender`：ReactElement 标题场景的双动作渲染替身，不依赖 key=action。
    const actionRender = () => [
      React.createElement('a', { key: 'a' }, 'A'),
      React.createElement('a', { key: 'b' }, 'B'),
    ];

    // `columns`：标题是包含“操作”的 span、字段为 op 的声明，验证静态提取标题仍能识别。
    const columns = [
      { title: '名称', dataIndex: 'name' },
      { title: React.createElement('span', null, '操作'), dataIndex: 'op', render: actionRender },
    ];

    // `processed`：从 ReactElement 标题派生的列数组，操作列仍应固定到右侧。
    const processed = buildProcessedColumns({ columns, localSort: false });
    // `last`：该场景派生末列，检查保留原 op 字段而不是重命名业务字段。
    const last = processed[processed.length - 1];

    expect(last.dataIndex).toBe('op');
    expect(last.fixed).toBe('right');

    // `node`：该操作列包装后的节点，检查仍是可识别 Space。
    const node = last.render(null, {}, 0);
    expect(React.isValidElement(node)).toBe(true);
    expect(node.type).toBe(Space);
  });

  /**
   * 嵌套 dataIndex 按路径值匹配并读取数值排序，特殊文本字段不改变结果。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('applySorting should support array dataIndex (nested fields)', () => {
    // `dataIndex`：嵌套字段 a.b 的分段路径数组，匹配时不能按数组引用身份判断。
    const dataIndex = ['a', 'b'];
    // `columns`：声明嵌套字段的列，用于验证排序读取完整路径。
    const columns = [{ title: '嵌套字段', dataIndex }];

    // `data`：包含 2/1/0 嵌套数字的记录夹具，特殊文本字段不能把数值 0 行固定到末尾。
    const data = [
      { id: 1, a: { b: 2 } },
      { id: 2, a: { b: 1 } },
      { id: 3, channelName: '合计', a: { b: 0 } },
    ];

    // `sorted`：按嵌套字段升序的实际新数组，应按数值 0/1/2 返回记录身份。
    const sorted = applySorting(data, { field: ['a', 'b'], order: 'ascend' }, columns);
    expect(sorted.map((/* `item`：嵌套升序结果的当前记录，只提取 id 断言最终顺序。 */ item) => item.id)).toEqual([
      3, 2, 1,
    ]);
  });

  /**
   * 列目录未就绪时仍可按明确字段排序，不因非数组 columns 抛错。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('applySorting should not throw when columns is not an array', () => {
    // `data`：无列配置时的普通数字字段数组，保留特殊文本反例防止业务硬编码复发。
    const data = [
      { id: 1, x: 2 },
      { id: 2, x: 1 },
      { id: 3, channelName: '合计', x: 0 },
    ];

    // `sorted`：columns=null 下默认字段升序结果，不能因列目录未就绪而抛错。
    const sorted = applySorting(data, { field: 'x', order: 'ascend' }, null);
    expect(
      sorted.map((/* `item`：缺少列目录时升序结果的当前记录，不根据特殊文本改变顺序。 */ item) => item.id)
    ).toEqual([3, 2, 1]);
  });

  /**
   * 本地排序派生列只开启图标，宿主原 sorter 函数引用保持不变。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('localSort should set sorter to true without mutating original', () => {
    // `sorter`：宿主按 x 数值相减的比较函数，原列必须保留该引用，派生列只开 sorter=true。
    const sorter = (
      /* `a`：首个宿主比较器的左记录，只读取 x 数值，不改变记录。 */ a,
      /* `b`：首个宿主比较器的右记录，与左侧 x 相减返回方向值。 */ b
    ) => a.x - b.x;
    // `columns`：带函数 sorter 的原单列声明，用于不可变性检查。
    const columns = [{ title: 'X', dataIndex: 'x', sorter }];

    // `processed`：本地排序的派生列，Antd 只显示图标，不执行宿主比较器。
    const processed = buildProcessedColumns({ columns, localSort: true });

    expect(columns[0].sorter).toBe(sorter);
    expect(processed[0].sorter).toBe(true);
  });

  /**
   * sortConfig 只给命中列发布当前方向，其他可排序列保持无活动方向。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('localSort should reflect current sortOrder based on sortConfig', () => {
    // `sorter`：受控 sortOrder 场景使用的 x 数值比较器，实际排序仍交给当前页规则。
    const sorter = (
      /* `a`：受控方向场景比较器的左记录，仍按实际 x 排序。 */ a,
      /* `b`：受控方向场景比较器的右记录，不用显示标题或数组位置推断值。 */ b
    ) => a.x - b.x;
    // `columns`：两列都可排序的声明，只有匹配当前 sortConfig 的列展示活动方向。
    const columns = [
      { title: 'X', dataIndex: 'x', sorter },
      { title: 'Y', dataIndex: 'y', sorter: true },
    ];

    // `processed`：按当前 x/ascend 派生的列，另一列 sortOrder 应为 null。
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

  /**
   * 宿主显式 sortOrder 的控制权优先于组件内部方向，不能被派生覆盖。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('localSort should not override explicit sortOrder from columns', () => {
    // `columns`：宿主明确声明 descend 的受控列，优先于组件内部 ascend 配置。
    const columns = [{ title: 'X', dataIndex: 'x', sorter: true, sortOrder: 'descend' }];

    // `processed`：显式 sortOrder 场景的派生结果，必须保留宿主控制权。
    const processed = buildProcessedColumns({
      columns,
      localSort: true,
      sortConfig: { field: 'x', order: 'ascend' },
    });

    expect(processed[0].sortOrder).toBe('descend');
  });
});

// ───── 模块结束：src/components/ProTable/__tests__/utils.test.js ─────
