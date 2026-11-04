/**
 * 模块职责：提供表格列宽、默认单元格、操作列和当前页本地排序的纯适配。
 * 不修改原 columns 或数据数组；排序不识别业务字段和合计行，远程数据排序由服务接口负责。
 * 默认渲染拒绝直接交付普通对象，复杂内容应通过列 render 明确声明，避免单元格使整页渲染失败。
 */
// 列标题可能已经是 ReactElement，宽度估算只读取 children，不能执行组件来探测文本。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// Space/Divider 只组织调用方声明的操作列节点，不建立权限或提交行为。
/**
 * `Divider`：只为宿主操作节点提供视觉分隔，不改变按钮行为。
 * `Space`：组织当前节点间距，不能接管宿主子节点的点击或提交语义。
 */
import { Divider, Space } from 'antd';

// 仅用于没有可安全渲染内容时的视觉占位，不把 0 当空值。
const DEFAULT_EMPTY_TEXT = '-';

/**
 * 从普通文本、数组和已有 ReactElement.children 递归提取标题文本，不执行函数组件。
 * @param {*} node 列标题节点。
 * @returns {string} 不可静态提取的内容为空串，供列宽估算使用。
 */
const extractNodeText = (node) => {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join('');
  if (React.isValidElement(node)) return extractNodeText(node.props?.children);
  return '';
};

/**
 * 把列标题收敛成列宽估算使用的普通字符串。
 * @param {*} title 字符串或 React 节点；空值返回空串。
 * @returns {string} 不影响实际表头的渲染节点。
 */
const getTitleText = (title) => {
  if (typeof title === 'string') return title;
  if (React.isValidElement(title)) return extractNodeText(title);
  if (title == null) return '';
  return String(title);
};

/**
 * 把没有自定义 render 的单元格值转成 React 可展示内容。
 * @param {*} value 0 保留、true 展示“是”，空串/null/false 和普通对象使用占位。
 * @returns {React.ReactNode} 原节点或安全显示值，不把对象 stringify 成可能泄漏的全文。
 */
const defaultCellRender = (value) => {
  if (React.isValidElement(value)) return value;
  // React 不会渲染 boolean（true/false 会被忽略），这里把 true 显式展示出来，避免“有值但空白”的错觉
  if (value === true) return '是';
  if (value == null || value === '' || value === false) return DEFAULT_EMPTY_TEXT;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : DEFAULT_EMPTY_TEXT;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  // React 不能直接渲染普通对象（会抛错）；数组里如果包含普通对象，也会导致表格单元格渲染时报错白屏。
  // 这里保留“可直接渲染”的数组（元素为 ReactElement/字符串/数字等），否则回退占位符。
  if (Array.isArray(value)) {
    // `isRenderableArray`：当前数组是否仅含可直接交给 React 的基础值或有效元素；普通对象出现时整格用占位。
    const isRenderableArray = value.every(
      (/* `item`：当前默认单元格数组项，只检查是否可直接渲染，不读取对象正文或执行函数。 */ item) =>
        item == null ||
        React.isValidElement(item) ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'bigint' ||
        typeof item === 'boolean'
    );
    return isRenderableArray ? value : DEFAULT_EMPTY_TEXT;
  }

  // React 不能直接渲染普通对象（会抛错），这里统一兜底为占位符，避免白屏。
  // 如果确实需要渲染对象，请在列上提供自定义 render。
  if (typeof value === 'object' && !Array.isArray(value)) {
    return DEFAULT_EMPTY_TEXT;
  }

  return value;
};

/**
 * 按静态标题长度估算 CSS 像素宽度，不以此限制正文长度。
 * @param {*} title 列标题，React 节点只提取已有文本子节点。
 * @returns {number} 最少 100px，每个标题字符预算 30px；显式 width 由调用方优先提供。
 */
export const calculateColumnWidth = (title) => {
  if (!title) return 100; // 无标题默认最小宽度

  // `titleStr`：从标题静态提取的文本；只用于宽度估算，不执行标题组件。
  const titleStr = getTitleText(title);

  // 计算字符数（中文、英文、数字都算一个字符）
  // `charCount`：标题文本的 UTF-16 长度，不是字形宽度或 Unicode 字素数量；估算保留既有粗粒度规则。
  const charCount = titleStr.length;

  // 每个字符 30 的宽度，最小 100px，确保短字段不会竖着显示
  // `calculatedWidth`：按长度×30 得到且至少 100 的 CSS 像素宽，不限制正文字符数。
  const calculatedWidth = Math.max(charCount * 30, 100);

  return calculatedWidth;
};

/**
 * 比较两列是否使用相同数据字段，兼容嵌套字段数组。
 * @param {string|string[]} a 第一份字段路径。
 * @param {string|string[]} b 第二份字段路径。
 * @returns {boolean} 数组逐段同值才匹配，不修改数组。
 */
const isSameDataIndex = (a, b) => {
  if (a === b) return true;
  // `aIsArray`：第一个 dataIndex 是否为分段路径数组，和另一侧共同决定逐段比较。
  const aIsArray = Array.isArray(a);
  // `bIsArray`：第二个 dataIndex 是否为分段路径数组；数组与标量不视为相同字段。
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;
  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false;
    return a.every(
      (
        /* `v`：第一个嵌套 dataIndex 当前路径段，与另一侧同位置严格比较。 */ v,
        /* `i`：字段路径的零起始位置；长度已经一致，避免比较不完整路径。 */ i
      ) => v === b[i]
    );
  }
  return false;
};

/**
 * 沿单个字段名或嵌套字段数组读取记录值。
 * @param {Object|null} record 当前记录，缺失中间层时返回 undefined。
 * @param {string|string[]} dataIndex 列声明的数据路径，不从文本解析表达式。
 * @returns {*} 原字段值，由调用方决定展示或排序方式。
 */
const getRecordValueByDataIndex = (record, dataIndex) => {
  if (record == null || dataIndex == null) return undefined;
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce(
      (
        /* `acc`：reduce 当前已读到的记录层级；中间层空值时持续返回 undefined。 */ acc,
        /* `key`：当前嵌套字段路径段，只作属性读取，不解析文本表达式。 */ key
      ) => (acc == null ? undefined : acc[key]),
      record
    );
  }
  return record[dataIndex];
};

/**
 * 仅重排传入的已加载数据；缺少有效排序配置时直接返回原数组引用。
 * @param {Object[]} data 当前页数据，排序时先复制数组，不修改调用方顺序。
 * @param {Object} sortConfig field/order 指定数据路径和 ascend/descend。
 * @param {Object[]} columns 可选列配置，自定义 sorter(a,b) 优先，否则数字相减/文本 localeCompare。
 * @returns {Object[]} 排序结果，不按任何业务名称固定行位置，也不代表远程全集顺序。
 */
export const applySorting = (data, sortConfig, columns) => {
  // `safeColumns`：可遍历的宿主列数组，非数组使用空数组，以便纯默认排序仍能运行。
  const safeColumns = Array.isArray(columns) ? columns : [];
  if (!sortConfig.field || !sortConfig.order) {
    return data;
  }

  // `sorted`：从 data 浅复制后排序的新数组；记录对象保持引用，原始数组顺序不变。
  const sorted = [...data].sort(
    (
      /* `a`：当前排序比较的第一条记录；传给宿主 sorter 或按 dataIndex 读取。 */ a,
      /* `b`：当前排序比较的第二条记录；比较函数不改变记录。 */ b
    ) => {
      // `field`：当前排序字段名或嵌套路径，由 sortConfig 指定，不识别任何固定业务字段。
      // `order`：当前 ascend/descend 方向；交给自定义 sorter 或默认比较后统一处理方向。
      const { field, order } = sortConfig;

      // 获取排序函数
      // `column`：dataIndex 与排序 field 匹配的列声明；存在自定义 sorter 时优先使用其函数。
      const column = safeColumns.find((/* `col`：原列数组中的候选声明，按完整 dataIndex 匹配当前排序字段。 */ col) =>
        isSameDataIndex(col.dataIndex, field)
      );
      // `sortFn`：匹配列的 sorter 候选；只有函数才执行，其它真值只影响表头排序开关。
      let sortFn = column?.sorter;

      // 如果 sorter 是函数，使用它
      if (typeof sortFn === 'function') {
        return order === 'ascend' ? sortFn(a, b) : -sortFn(a, b);
      }

      // `dataIndex`：匹配列声明的读取路径，缺失时沿 sortConfig.field；用于获取两个记录的比较值。
      const dataIndex = column?.dataIndex ?? field;

      // 默认排序逻辑
      // `valueA`：第一条比较记录的字段值，null/undefined 按空串；两侧均 number 时直接数值比较。
      const valueA = getRecordValueByDataIndex(a, dataIndex) ?? '';
      // `valueB`：第二条比较记录的字段值；非纯数字组合走文本 localeCompare，不隐式解析业务数值。
      const valueB = getRecordValueByDataIndex(b, dataIndex) ?? '';

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return order === 'ascend' ? valueA - valueB : valueB - valueA;
      }

      // 字符串排序
      // `strA`：第一条比较值的文本表示，供当前运行环境的 localeCompare 使用。
      const strA = String(valueA);
      // `strB`：第二条比较值的文本表示；默认排序次序依赖运行环境 locale。
      const strB = String(valueB);
      return order === 'ascend' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
  );

  return sorted;
};

// 处理操作列，自动将按钮横向排列并用竖线分隔，并固定在右侧最后面
/**
 * 统一处理 columns：
 * - 自动计算列宽（避免标题换行/竖排）
 * - 注入默认 render（避免对象/空值导致 React 渲染报错或“有值但空白”）
 * - 操作列自动右侧固定 + Space/Divider 紧凑排列
 * - localSort 场景下注入 sorter=true + 受控 sortOrder（仅用于 UI 展示）
 *
 * @param {Object} options
 * @param {Array} options.columns
 * @param {boolean} options.localSort
 * @param {{field?: string|Array, order?: 'ascend'|'descend'|null}} [options.sortConfig]
 * @returns {Array|*} 处理后的 columns（非数组则原样返回）
 */
export const buildProcessedColumns = ({ columns, localSort, sortConfig }) => {
  if (!columns || !Array.isArray(columns)) {
    return columns;
  }

  // `hasSortConfig`：是否同时提供排序字段与方向；用于派生列的受控 sortOrder，不触发请求。
  const hasSortConfig = sortConfig && sortConfig.field != null && sortConfig.order;

  // 为每个列添加自动计算的宽度，并强制最小宽度为75px
  // `columnsWithWidth`：按原顺序派生的新列数组，为每列补宽度、渲染和本地排序状态。
  const columnsWithWidth = columns.map(
    (/* `column`：正在派生的宿主列声明；新宽度/render 写进副本，不回写此对象。 */ column) => {
      // `finalWidth`：当前列最终 CSS 像素宽；显式 width 优先，否则估算，最后至少 75。
      let finalWidth;

      // 如果已经设置了 width，使用设置的宽度
      if (column.width !== undefined) {
        finalWidth = column.width;
      } else {
        // 未设置宽度，自动计算
        finalWidth = calculateColumnWidth(column.title);
      }

      // 强制最小宽度为75px（即使手动设置了更小的值）
      finalWidth = Math.max(finalWidth, 75);

      // `render`：当前列的宿主渲染函数或安全默认渲染；传给新列对象，不修改原列。
      const render = typeof column?.render === 'function' ? column.render : defaultCellRender;

      // 本地排序模式：将 sorter 函数改为 true，禁用 Table 内置排序
      // 这样 Table 只显示排序图标，实际排序由 handleTableChange 处理
      // `processedColumn`：当前列的浅副本，保留宿主配置并统一宽度、render 和可选 sortOrder。
      const processedColumn = {
        ...column,
        width: finalWidth,
        render,
      };

      if (localSort && column.sorter) {
        processedColumn.sorter = true;

        // 本地排序是“受控排序”：Table 只负责展示排序状态，具体排序由 ProTable 维护。
        // 若外部已显式传入 sortOrder（完全受控），这里不覆盖；否则根据 sortConfig 注入当前排序状态。
        if (processedColumn.sortOrder === undefined) {
          processedColumn.sortOrder =
            hasSortConfig && isSameDataIndex(column.dataIndex, sortConfig.field) ? sortConfig.order : null;
        }
      }

      return processedColumn;
    }
  );

  // 查找操作列的索引
  // `actionColumnIndex`：最后一个匹配操作列的位置，初始 -1；仅它移至末尾固定，避免重排其它列。
  let actionColumnIndex = -1;
  // `actionColumn`：最后一个匹配操作列的派生对象，未找到时 null，不创建虚假操作列。
  let actionColumn = null;

  columnsWithWidth.forEach(
    (
      /* `column`：已派生的候选列；按通用操作约定找出需移至最右的最后一列。 */ column,
      /* `index`：候选操作列在派生数组中的位置；找到后用于移除原位置。 */ index
    ) => {
      // 检测是否为操作列（title 为 '操作' 或 key 为 'action'）
      // `isActionColumn`：当前列标题/键/字段是否匹配通用操作约定；不根据业务字段猜测。
      const isActionColumn =
        getTitleText(column.title) === '操作' ||
        column.key === 'action' ||
        (column.dataIndex && column.dataIndex === 'action');

      if (isActionColumn && column.render) {
        actionColumnIndex = index;
        actionColumn = column;
      }
    }
  );

  // 如果没有找到操作列，直接返回带宽度的 columns
  if (actionColumnIndex === -1 || !actionColumn) {
    return columnsWithWidth;
  }

  // 包装操作列的 render 函数
  // `originalRender`：操作列原始渲染函数；包装层调用一次，再按返回内容决定是否加 Space。
  const originalRender = actionColumn.render;
  // `processedActionColumn`：固定在右侧且包裹通用间距的操作列新对象，不覆盖宿主按钮事件。
  const processedActionColumn = {
    ...actionColumn,
    // 操作列固定在右侧最后面（最高层级）
    fixed: 'right',
    render: (
      /* `text`：Antd 传给操作列的原单元格值，原样交给宿主 originalRender。 */ text,
      /* `record`：Antd 当前行记录，包装层不附加权限或业务状态。 */ record,
      /* `index`：当前页行下标，原样交给宿主渲染，不作为稳定行身份。 */ index
    ) => {
      // `result`：宿主操作渲染返回值；已有 Space 直接保留，基础文本直接返回，其余节点规范化。
      const result = originalRender(text, record, index);

      // 如果结果已经是 Space 组件，直接返回（避免重复处理）
      if (
        React.isValidElement(result) &&
        result.type &&
        (result.type.displayName === 'Space' ||
          result.type.name === 'Space' ||
          result.type === Space ||
          result.type.__ANT_SPACE === true ||
          (result.type._context && result.type._context.displayName === 'Space'))
      ) {
        return result;
      }

      // 收集所有需要渲染的按钮元素
      // `buttons`：从数组、Fragment 或单元素派生的操作节点列表；不遍历执行 React 组件。
      let buttons = [];

      // 如果是数组，直接使用
      if (Array.isArray(result)) {
        buttons = result;
      }
      // 如果是 React 元素
      else if (React.isValidElement(result)) {
        // 对于单个React元素（如Button），直接使用元素本身
        // 只有当元素是Fragment或其他容器组件时才提取children
        if (result.type === React.Fragment || (result.type && result.type.displayName === 'Fragment')) {
          // Fragment情况，提取children
          // `children`：当前 Fragment 的 React.Children 扁平数组；无子项时仍保留原 Fragment。
          const children = React.Children.toArray(result.props.children);
          buttons = children.length > 0 ? children : [result];
        } else {
          // 其他React元素（包括Button），直接使用元素本身
          buttons = [result];
        }
      }
      // 其他情况（字符串、数字等）
      else {
        return result;
      }

      // 过滤掉 null、undefined、false 等无效元素
      // `validButtons`：剔除 null/undefined/false 与不可直接显示值后的操作节点，空列表不创建占位容器。
      const validButtons = buttons.filter(
        (/* `item`：候选操作节点；仅保留 React 元素、文本和数字，不吞掉其点击事件。 */ item) =>
          item !== null &&
          item !== undefined &&
          item !== false &&
          (React.isValidElement(item) || typeof item === 'string' || typeof item === 'number')
      );

      if (validButtons.length === 0) {
        return null;
      }

      // 无论单个还是多个按钮，都用Space包装以确保一致性
      if (validButtons.length === 1) {
        // 对于单个元素，确保事件不被阻止
        return React.createElement(Space, { size: 'small', style: { display: 'inline-flex' } }, validButtons[0]);
      }

      // 多个按钮，用 Space 和 Divider 包裹
      return React.createElement(
        Space,
        { split: React.createElement(Divider, { type: 'vertical' }), size: 'small' },
        validButtons
      );
    },
  };

  // 创建新的 columns 数组：将操作列移到最后面，其他列保持原顺序
  // `newColumns`：最终列数组副本，移除原操作列位置并追加包装后的操作列，其它顺序不变。
  const newColumns = [...columnsWithWidth];
  // 移除原位置的操作列
  newColumns.splice(actionColumnIndex, 1);
  // 将处理后的操作列插入到最后面
  newColumns.push(processedActionColumn);

  return newColumns;
};

// ───── 模块结束：src/components/ProTable/utils.js ─────
