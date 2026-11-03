/**
 * @file src/components/SearchForm/index.jsx
 * @description ProTable 内置搜索表单：支持常用字段首行展示、Top Drawer 高级搜索、Enter 快捷搜索等。
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Form, Button, Row, Col, Space, Input, Select, DatePicker } from 'antd';
import { SearchOutlined, ReloadOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import {
  SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN,
  getSearchFormContainerClassName,
  getSearchFormFieldKey,
  getSearchFormFieldOptions,
  getSearchFormFieldSpan,
  getSearchFormMoreButtonText,
  hasSearchFormFieldLabel,
  shouldTriggerSearchFormEnter,
  splitSearchFormFields,
} from './flow';
import AdminDrawer from '../AdminDrawer';
import { createTaskGate } from '../AsyncOverlay/taskGate';
import './index.less';
const { RangePicker } = DatePicker;

/**
 * 搜索表单组件
 * @param {Object} form - 表单实例（由父组件传入）
 * @param {Array} fields - 表单字段配置
 * @param {Function} onSearch - 搜索回调
 * @param {Function} onReset - 重置回调
 * @param {Function} toolBarRender - 工具栏渲染函数
 * @param {Number} maxVisibleSpan - 第一排最大显示的 span 总和，默认 24
 * @param {Object} initialValues - 表单初始值
 * @param {'card'|'embedded'} variant - UI 变体：card（默认）/ embedded（用于嵌入 ProTable 卡片）
 */
const SearchForm = ({
  form,
  fields,
  onSearch,
  onReset,
  toolBarRender,
  maxVisibleSpan = SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN,
  initialValues,
  variant = 'card',
  loading = false,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [fieldBudget, setFieldBudget] = useState(maxVisibleSpan);
  const containerRef = useRef(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const gate = useRef(createTaskGate());
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const owner = gate.current;
    return () => {
      mounted.current = false;
      owner.cancel();
    };
  }, []);
  const closeDrawer = () => {
    gate.current.cancel();
    setValidating(false);
    setDrawerVisible(false);
  };
  const busy = loading || validating;
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const resize = () =>
      setFieldBudget(element.clientWidth < 900 || innerHeight < 500 ? Math.min(6, maxVisibleSpan) : maxVisibleSpan);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener('resize', resize);
    resize();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [maxVisibleSpan]);
  const containerClassName = getSearchFormContainerClassName(variant);
  // 注意：form 应该由父组件通过 ProTable 传入，这里不创建 defaultForm
  // 以避免出现 "Instance created by useForm is not connected to any Form element" 警告
  const formInstance = form;

  // 计算哪些字段在第一排显示，哪些字段进入抽屉（避免 useEffect + setState 带来的首帧空白/跳动）
  const { visibleFields, hiddenFields } = useMemo(() => {
    return splitSearchFormFields(fields, fieldBudget);
  }, [fields, fieldBudget]);

  /**
   * 执行搜索前的统一校验入口。
   *
   * @returns {Promise<boolean>} 校验通过并已触发搜索时返回 true。
   */
  const handleSearch = async () => {
    if (!formInstance || loading) return false;
    const task = gate.current.begin();
    if (!task) return false;
    setValidating(true);
    setError('');
    try {
      const values = await formInstance.validateFields();
      if (!mounted.current || !task.isCurrent()) return false;
      await onSearch?.(values);
      return mounted.current && task.isCurrent();
    } catch (failure) {
      if (mounted.current && task.isCurrent() && !failure?.errorFields)
        setError(failure?.message || '搜索失败，请重试');
      return false;
    } finally {
      if (mounted.current && task.isCurrent()) setValidating(false);
      task.finish();
    }
  };

  /**
   * 重置表单并复位高级搜索抽屉。
   */
  const handleReset = () => {
    if (!formInstance || busy) return;
    setError('');
    formInstance.resetFields();
    onReset?.();
    // 重置后关闭抽屉
    setDrawerVisible(false);
  };

  // 抽屉中的搜索和重置
  const handleDrawerSearch = () => {
    handleSearch().then((ok) => {
      // 校验通过且已触发搜索后才关闭抽屉，避免“校验失败仍关闭”导致用户误解
      if (ok) setDrawerVisible(false);
    });
  };

  const handleDrawerReset = () => {
    handleReset();
  };

  /**
   * 处理 SearchForm 的 Enter 快捷搜索。
   *
   * @param {KeyboardEvent} event 键盘事件。
   * @param {boolean} isDrawer 当前是否来自高级搜索抽屉。
   */
  const handleKeyDown = (e, isDrawer = false) => {
    if (!shouldTriggerSearchFormEnter(e)) {
      return;
    }

    e.preventDefault();
    // 阻止冒泡，防止重复触发
    e.stopPropagation();

    if (isDrawer) {
      handleDrawerSearch();
    } else {
      handleSearch();
    }
  };

  /**
   * 根据字段配置生成对应的表单输入组件。
   *
   * @param {Record<string, any>} field 单个搜索字段配置。
   * @returns {React.ReactNode} 实际渲染的输入组件。
   */
  const getFieldComponent = (field) => {
    // 如果已经提供了 component，直接使用
    if (field.component) {
      return field.component;
    }

    // 根据 type 生成组件
    switch (field.type) {
      case 'input':
        return <Input placeholder={field.placeholder} allowClear {...field.fieldProps} />;
      case 'select':
        return (
          <Select
            placeholder={field.placeholder}
            allowClear
            options={getSearchFormFieldOptions(field)}
            {...field.fieldProps}
          />
        );
      case 'dateRange':
        return <RangePicker style={{ width: '100%' }} {...field.fieldProps} />;
      default:
        return <Input placeholder={field.placeholder} allowClear {...field.fieldProps} />;
    }
  };

  /**
   * 渲染搜索字段列表。
   *
   * @param {Array<Record<string, any>>} fieldsToRender 当前要渲染的字段集合。
   * @param {boolean} isDrawer 是否渲染在高级搜索抽屉内。
   * @returns {React.ReactNode} 字段栅格布局。
   */
  const renderFields = (fieldsToRender, isDrawer = false) => {
    return (
      <Row className={isDrawer ? undefined : 'search-form-fields'} gutter={[16, 16]}>
        {fieldsToRender.map((field, index) => {
          const fieldKey = getSearchFormFieldKey(field?.name, index);
          const hasLabel = hasSearchFormFieldLabel(field);
          // 获取字段组件（根据 type 或 component）
          const component = getFieldComponent(field);
          // 克隆 component 并确保它有唯一的 key
          const clonedComponent = React.isValidElement(component)
            ? React.cloneElement(component, { key: `field-${fieldKey}` })
            : component;

          return (
            <Col
              key={fieldKey}
              xs={24}
              sm={12}
              md={!isDrawer && fieldBudget < maxVisibleSpan ? 24 : getSearchFormFieldSpan(field, isDrawer)}
              lg={!isDrawer && fieldBudget < maxVisibleSpan ? 24 : getSearchFormFieldSpan(field, false)}
              xl={!isDrawer && fieldBudget < maxVisibleSpan ? 24 : getSearchFormFieldSpan(field, false)}
            >
              <Form.Item
                label={hasLabel ? field.label : undefined}
                name={field.name}
                rules={field.rules}
                initialValue={field.initialValue}
                labelCol={hasLabel ? { flex: '0 0 100px' } : undefined}
                wrapperCol={hasLabel ? { flex: '1' } : undefined}
              >
                {clonedComponent}
              </Form.Item>
            </Col>
          );
        })}
      </Row>
    );
  };

  /**
   * 统一处理 toolBarRender 的数组 / 单节点返回值。
   *
   * @returns {React.ReactNode|null} 已归一化的工具栏内容。
   */
  const renderToolbar = () => {
    if (!toolBarRender) {
      return null;
    }

    const rendered = toolBarRender();
    if (Array.isArray(rendered)) {
      return rendered.map((item, index) => <React.Fragment key={index}>{item}</React.Fragment>);
    }
    return rendered;
  };

  if (!fields || fields.length === 0) {
    // 如果没有搜索字段，只显示工具栏，并保证 form 实例被挂载以消除 antd useForm 警告
    const renderedToolBar = renderToolbar();

    return (
      <div className={containerClassName} ref={containerRef}>
        {formInstance ? <Form form={formInstance} /> : null}
        <div className="toolbar-only">{renderedToolBar}</div>
      </div>
    );
  }

  const hasMoreFields = hiddenFields.length > 0;

  // 如果没有 formInstance，不渲染表单部分
  if (!formInstance && fields && fields.length > 0) {
    return null;
  }

  return (
    <div className={containerClassName} ref={containerRef}>
      {formInstance && (
        <Form form={formInstance} initialValues={initialValues} onKeyDown={(e) => handleKeyDown(e, false)}>
          {/* 第一排显示的字段 */}
          {renderFields(visibleFields)}

          {/* 如果有更多字段，显示"显示更多"按钮 */}
          {hasMoreFields && (
            <Row>
              <Col span={24}>
                <div className="search-form-more">
                  <Button
                    type="link"
                    icon={drawerVisible ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => setDrawerVisible(!drawerVisible)}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    {getSearchFormMoreButtonText(drawerVisible, fields.length)}
                  </Button>
                </div>
              </Col>
            </Row>
          )}

          {/* 操作按钮 */}
          <Row>
            <Col span={24}>
              <div className="search-form-actions">
                {error && <span role="alert">{error}</span>}
                <Space>
                  <Button type="primary" loading={busy} icon={<SearchOutlined />} onClick={handleSearch}>
                    搜索
                  </Button>
                  <Button disabled={busy} icon={<ReloadOutlined />} onClick={handleReset}>
                    重置
                  </Button>
                </Space>
                {/* 工具栏按钮 */}
                {toolBarRender && <div className="toolbar-buttons">{renderToolbar()}</div>}
              </div>
            </Col>
          </Row>

          {/* 抽屉 - 从上方滑出，显示隐藏字段 */}
          {hasMoreFields && (
            <AdminDrawer
              title="高级搜索"
              placement="top"
              height="min(80dvh, 36rem)"
              open={drawerVisible}
              onClose={closeDrawer}
              destroyOnHidden={false}
              footer={
                <Space>
                  <Button type="primary" loading={busy} icon={<SearchOutlined />} onClick={handleDrawerSearch}>
                    搜索
                  </Button>
                  <Button disabled={busy} icon={<ReloadOutlined />} onClick={handleDrawerReset}>
                    重置
                  </Button>
                  <Button onClick={closeDrawer}>取消</Button>
                </Space>
              }
            >
              <div onKeyDown={(e) => handleKeyDown(e, true)}>{renderFields(hiddenFields, true)}</div>
            </AdminDrawer>
          )}
        </Form>
      )}
    </div>
  );
};

export default SearchForm;
