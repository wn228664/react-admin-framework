import React from 'react';
import { Divider, Space } from 'antd';

const DEFAULT_EMPTY_TEXT = '-';

const extractNodeText = (node) => {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join('');
  if (React.isValidElement(node)) return extractNodeText(node.props?.children);
  return '';
};

const getTitleText = (title) => {
  if (typeof title === 'string') return title;
  if (React.isValidElement(title)) return extractNodeText(title);
  if (title == null) return '';
  return String(title);
};

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
    const isRenderableArray = value.every(
      (item) =>
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

// 计算表头字数并生成宽度
export const calculateColumnWidth = (title) => {
  if (!title) return 100; // 无标题默认最小宽度

  const titleStr = getTitleText(title);

  // 计算字符数（中文、英文、数字都算一个字符）
  const charCount = titleStr.length;

  // 每个字符 30 的宽度，最小 100px，确保短字段不会竖着显示
  const calculatedWidth = Math.max(charCount * 30, 100);

  return calculatedWidth;
};

const isSameDataIndex = (a, b) => {
  if (a === b) return true;
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;
  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  return false;
};

const getRecordValueByDataIndex = (record, dataIndex) => {
  if (record == null || dataIndex == null) return undefined;
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce((acc, key) => (acc == null ? undefined : acc[key]), record);
  }
  return record[dataIndex];
};

// 执行本地排序的通用方法
export const applySorting = (data, sortConfig, columns) => {
  const safeColumns = Array.isArray(columns) ? columns : [];
  if (!sortConfig.field || !sortConfig.order) {
    return data;
  }

  let sorted = [...data].sort((a, b) => {
    const { field, order } = sortConfig;

    // 获取排序函数
    const column = safeColumns.find((col) => isSameDataIndex(col.dataIndex, field));
    let sortFn = column?.sorter;

    // 如果 sorter 是函数，使用它
    if (typeof sortFn === 'function') {
      return order === 'ascend' ? sortFn(a, b) : -sortFn(a, b);
    }

    const dataIndex = column?.dataIndex ?? field;

    // 默认排序逻辑
    const valueA = getRecordValueByDataIndex(a, dataIndex) ?? '';
    const valueB = getRecordValueByDataIndex(b, dataIndex) ?? '';

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return order === 'ascend' ? valueA - valueB : valueB - valueA;
    }

    // 字符串排序
    const strA = String(valueA);
    const strB = String(valueB);
    return order === 'ascend' ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });

  // 将合计行移到最后（单次遍历优化）
  const summaryRows = [];
  const regularRows = [];

  sorted.forEach((item) => {
    if (item.channelName === '合计') {
      summaryRows.push(item);
    } else {
      regularRows.push(item);
    }
  });

  return [...regularRows, ...summaryRows];
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

  const hasSortConfig = sortConfig && sortConfig.field != null && sortConfig.order;

  // 为每个列添加自动计算的宽度，并强制最小宽度为75px
  const columnsWithWidth = columns.map((column) => {
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

    const render = typeof column?.render === 'function' ? column.render : defaultCellRender;

    // 本地排序模式：将 sorter 函数改为 true，禁用 Table 内置排序
    // 这样 Table 只显示排序图标，实际排序由 handleTableChange 处理
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
  });

  // 查找操作列的索引
  let actionColumnIndex = -1;
  let actionColumn = null;

  columnsWithWidth.forEach((column, index) => {
    // 检测是否为操作列（title 为 '操作' 或 key 为 'action'）
    const isActionColumn =
      getTitleText(column.title) === '操作' ||
      column.key === 'action' ||
      (column.dataIndex && column.dataIndex === 'action');

    if (isActionColumn && column.render) {
      actionColumnIndex = index;
      actionColumn = column;
    }
  });

  // 如果没有找到操作列，直接返回带宽度的 columns
  if (actionColumnIndex === -1 || !actionColumn) {
    return columnsWithWidth;
  }

  // 包装操作列的 render 函数
  const originalRender = actionColumn.render;
  const processedActionColumn = {
    ...actionColumn,
    // 操作列固定在右侧最后面（最高层级）
    fixed: 'right',
    render: (text, record, index) => {
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
      const validButtons = buttons.filter(
        (item) =>
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
  const newColumns = [...columnsWithWidth];
  // 移除原位置的操作列
  newColumns.splice(actionColumnIndex, 1);
  // 将处理后的操作列插入到最后面
  newColumns.push(processedActionColumn);

  return newColumns;
};
