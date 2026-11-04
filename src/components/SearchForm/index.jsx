/**
 * 模块职责：持有搜索交互的校验周期，按真实容器宽度把字段分配到首行或高级抽屉。
 * Form 实例与字段值归父级；只有校验通过的快照才交给 onSearch，不在输入时自动发请求。
 * 关闭抽屉或卸载取消当前校验结果消费；失败保留输入，短视口由搜索组件内部承接必要滚动。
 */
// Hook 保存抽屉、校验和同步门闩，memo 派生字段分组，effect 负责释放周期。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 * `useMemo`：按声明依赖派生配置/视图，不能作为永不丢失的业务状态或副作用所有者。
 * `useRef`：保存跨渲染 owner、DOM 或任务身份；写 current 不会触发重渲染，清理由配对生命周期负责。
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
/** `getMsg`：只选择非空公开文本，异常 message 对象回退默认文案，不能直接作为 React 子节点。 */
import { getMsg } from '@/utils/robust';

// useSize 测量实际容器，窗口 resize 只补充短视口高度条件；监听随组件释放。
/**
 * `useEventListener`：按组件生命周期绑定/解除平台事件，避免 render 重复注册处理器。
 * `useSize`：监听实际挂载容器的尺寸，初次可为空，不能用窗口宽度代替。
 */
import { useEventListener, useSize } from 'ahooks';
// Form/栅格组织字段，Input/Select/RangePicker 只展示声明配置，不拼接服务参数。
/**
 * `Form`：持有同一份字段草稿和验证规则，SearchForm 与 ProTable 共享实例。
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 * `Row`：提供 24 栅格行布局，首行预算和抽屉分组由搜索规则决定。
 * `Col`：按容器断点分配字段宽度，溢出内容不能撑开文档根。
 * `Space`：组织当前节点间距，不能接管宿主子节点的点击或提交语义。
 * `Input`：显示受控文本草稿，值更新和提交是两个独立动作。
 * `Select`：显示明确配置的选项和值，选项确认不应触发表单快捷搜索。
 * `DatePicker`：提供日期范围控件入口，日期值/格式由字段配置声明。
 */
import { Form, Button, Row, Col, Space, Input, Select, DatePicker } from 'antd';
// 图标只表达搜索、重置和高级字段折叠状态。
/**
 * `SearchOutlined`：搜索入口的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `ReloadOutlined`：重置/刷新动作的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `UpOutlined`：高级搜索收起状态的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `DownOutlined`：高级搜索展开状态的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import { SearchOutlined, ReloadOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
// 纯流程函数统一字段标识、栅格预算和 Enter 判定，避免 UI 自行猜测字段类型。
/**
 * `SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN`：首行默认总预算 24 栅格；窄容器可由组件缩小，超出项不丢弃。
 * `getSearchFormContainerClassName`：按 card/embedded 变体生成根类名，嵌入表格时追加专用布局约束，查询协议保持一致。
 * `getSearchFormFieldKey`：把字段名归一化为可稳定复用的 React key。
 * `getSearchFormFieldOptions`：兜底读取 Select options，避免异常结构直接传给 antd Select。
 * `getSearchFormFieldSpan`：读取字段在当前布局下应使用的栅格宽度。
 * `getSearchFormMoreButtonText`：生成“展开更多搜索条件”按钮文案。
 * `hasSearchFormFieldLabel`：判断字段是否应该渲染标签。
 * `shouldTriggerSearchFormEnter`：判断本次 Enter 是否允许由搜索表单接管。
 * `splitSearchFormFields`：把字段按首行展示与高级搜索抽屉拆分。
 */
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
// 高级搜索沿用统一抽屉滚动和关闭契约，不建立第二套浮层行为。
/**
 * `AdminDrawer`：提供受控抽屉、确认门闩和正文滚动，成功关闭仍由父级更新 open。
 */
import AdminDrawer from '../AdminDrawer';
// 同步门闩拦截同一帧重复校验，取消后旧 Promise 无权关闭新抽屉。
/**
 * `createTaskGate`：创建一个不共享全局状态的任务门闩，owner 卸载时必须 cancel。
 */
import { createTaskGate } from '../AsyncOverlay/taskGate';
// 搜索样式约束首行、工具栏和抽屉字段的溢出边界。
import './index.less';
// `RangePicker`：Antd 日期范围控件的局部别名；仅用于 type=dateRange 的声明字段，值格式由 fieldProps 决定。
const { RangePicker } = DatePicker;

/**
 * 按实际容器预算展示搜索字段和高级抽屉，所有字段复用父级 Form。
 * @param {Object} props 宿主声明的搜索配置，不包含任何固定服务字段。
 * @param {Object} props.form 已由父级创建的 Antd Form；缺失且有字段时不渲染表单。
 * @param {Object[]} [props.fields] 按声明顺序的字段；name/rules/initialValue 直接交给 Form.Item。
 * @param {Function} [props.onSearch] 接收一次 validateFields 成功快照；可返回 Promise，失败保留输入。
 * @param {Function} [props.onReset] resetFields 后同步通知父级；应由宿主避免抛出未处理异常。
 * @param {Function} [props.toolBarRender] 同步返回节点或节点数组，不创建另一套表单。
 * @param {number} [props.maxVisibleSpan=24] 首行栅格总预算；窄屏/短横屏最多分配 6。
 * @param {Object} [props.initialValues] 交给共享 Form 的初始值；重置遵循 Form 的原生规则。
 * @param {"card"|"embedded"} [props.variant="card"] 外框样式变体，不改变字段提交协议。
 * @param {boolean} [props.loading=false] 父级请求忙碌态，与本地校验锁一起约束搜索和重置。
 * @returns {React.ReactElement|null} 有界搜索区；关闭/卸载使旧校验结果失效，但不能取消宿主已发生的远端副作用。
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
  // 抽屉只管理高级字段的可见性，字段值仍保留在同一个父级 Form 中。
  // `drawerVisible`：高级字段抽屉的本地可见性，默认 false；字段草稿始终保存在父级同一个 Form。
  // `setDrawerVisible`：更新高级字段抽屉的可见性；关闭不清空同一 Form 中保存的草稿。
  const [drawerVisible, setDrawerVisible] = useState(false);
  // ref 必须落到实际搜索外框，测得的宽度不能用 window 宽度替代。
  const containerRef = useRef(null);
  // `containerSize`：useSize 监听搜索外框得到的实际宽高；首轮可能为空，不能当成窗口宽度。
  const containerSize = useSize(containerRef);
  // 高度是短横屏折叠条件，SSR/测试缺少窗口时使用 Infinity 保留常规预算。
  // `viewportHeight`：最近一次视口高度，单位 CSS px；无窗口时 Infinity，仅用于短横屏折叠而不猜表格高度。
  // `setViewportHeight`：resize 后保存视口 CSS 像素高；与容器宽度共同控制短横屏折叠。
  const [viewportHeight, setViewportHeight] = useState(() => globalThis.innerHeight ?? Infinity);
  useEventListener(
    'resize',
    /**
     * 窗口尺寸变化后更新当前视口高度，仅辅助短视口折叠预算；字段宽度仍由真实容器测量决定。
     * @returns {void}
     */ () => setViewportHeight(window.innerHeight)
  );
  // 容器宽度与短视口共同决定首行预算；弹窗内使用时不能只看 window 宽度。
  const compact = (containerSize?.width ?? Infinity) < 900 || viewportHeight < 500;
  // 窄容器最多保留 6 个栅格单位，其余字段在受控抽屉中仍可到达。
  const fieldBudget = compact ? Math.min(6, maxVisibleSpan) : maxVisibleSpan;
  // validating 仅显示等待，gate 同步占锁；error 只保存非字段级失败文案。
  // `setValidating`：展示当前校验等待态；真正互斥由同步 gate 实施，不能只靠 React 状态挡连点。
  const [validating, setValidating] = useState(false);
  // `error`：当前校验周期的非字段级公开错误文本，默认空串；Antd 字段错误仍在字段旁显示。
  // `setError`：更新非字段级公开失败文本；字段校验错误留给 Antd Form 原位展示。
  const [error, setError] = useState('');
  // 门闩与 mounted 引用共同限定当前 owner，卸载后不发布校验结果。
  const gate = useRef(createTaskGate());
  // `mounted`：当前搜索实例是否存活的同步 ref，初始 false；卸载先置假再取消 gate，迟到结果不能写状态。
  const mounted = useRef(false);
  useEffect(
    /**
     * 为本次挂载记录存活身份并捕获校验门闩，返回卸载清理；搜索草稿继续归 Form 持有。
     * @returns {Function}
     */ () => {
      mounted.current = true;
      // `owner`：当前 effect 捕获的任务门闩；卸载撤销它，避免读取后续可能被替换的 ref。
      const owner = gate.current;
      return (
        /**
         * 先阻止本 owner 消费异步校验结果，再取消其门闩，避免卸载后关闭新抽屉或发布错误。
         * @returns {void}
         */ () => {
          mounted.current = false;
          owner.cancel();
        }
      );
    },
    []
  );
  /**
   * 撤销当前校验周期再关闭高级字段视图，保留 Form 中已有输入。
   * @returns {void} 迟到的 validateFields/onSearch 结果不能再改变当前抽屉。
   */
  const closeDrawer = () => {
    gate.current.cancel();
    setValidating(false);
    setDrawerVisible(false);
  };
  // `busy`：父级请求 loading 或本地校验 validating 任一为真时的操作禁用状态。
  const busy = loading || validating;
  // `containerClassName`：根据 card/embedded 变体派生的根类名，统一约束内部滚动和工具栏布局。
  const containerClassName = getSearchFormContainerClassName(variant);
  // 注意：form 应该由父组件通过 ProTable 传入，这里不创建 defaultForm
  // 以避免出现 "Instance created by useForm is not connected to any Form element" 警告
  // 复用父级实例，禁止在这里 useForm 创建未连接的镜像草稿。
  // `formInstance`：父级 Form 实例的局部别名；当前组件不创建未挂载的备用表单或第二份草稿。
  const formInstance = form;

  // 计算哪些字段在第一排显示，哪些字段进入抽屉（避免 useEffect + setState 带来的首帧空白/跳动）
  // `visibleFields`：按栅格预算连续分配到首行的字段数组；来自同一 fields 声明，顺序保持不变。
  // `hiddenFields`：超出首行预算后的剩余字段，放入高级抽屉且继续连接同一 Form。
  const { visibleFields, hiddenFields } = useMemo(() => {
    return splitSearchFormFields(fields, fieldBudget);
  }, [fields, fieldBudget]);

  /**
   * 同步占锁后校验共享 Form，并等待宿主搜索完成。
   * @returns {Promise<boolean>} 仅当前存活周期校验与 onSearch 都成功时为 true；无实例、忙碌、取消和失败均 false。
   * 字段错误由 Form 展示，其它当前错误写入内联提示；finally 只释放自己的周期，旧 Promise 不清除新任务状态。
   */
  const handleSearch = async () => {
    if (!formInstance || loading) return false;
    // `task`：当前校验获得的唯一周期句柄；取不到表示已有校验，所有 await 后需核对它是否仍有效。
    const task = gate.current.begin();
    if (!task) return false;
    setValidating(true);
    setError('');
    try {
      // `values`：validateFields 返回的已校验快照；只交给本次 onSearch，不混入继续编辑后的草稿。
      const values = await formInstance.validateFields();
      if (!mounted.current || !task.isCurrent()) return false;
      await onSearch?.(values);
      return mounted.current && task.isCurrent();
    } catch (/* `failure`：字段校验或 onSearch 的拒绝值；errorFields 交给 Form，其它错误仅在当前周期显示。 */ failure) {
      if (mounted.current && task.isCurrent() && !failure?.errorFields) setError(getMsg(failure, '搜索失败，请重试'));
      return false;
    } finally {
      if (mounted.current && task.isCurrent()) setValidating(false);
      task.finish();
    }
  };

  /**
   * 空闲时清除公开错误并恢复 Form 初始值，再同步通知父级和收起高级抽屉。
   * @returns {void} 忙碌或缺少实例时不操作；onReset 应同步且不抛错，不以此撤销已发生的远端请求。
   */
  const handleReset = () => {
    if (!formInstance || busy) return;
    setError('');
    formInstance.resetFields();
    onReset?.();
    // 重置后关闭抽屉
    setDrawerVisible(false);
  };

  /**
   * 沿统一校验入口提交；只有有效周期成功后才收起抽屉，失败保留输入。
   * @returns {void} Promise 的错误由 handleSearch 消费并转成字段/内联提示。
   */
  const handleDrawerSearch = () => {
    handleSearch().then((/* `ok`：统一搜索入口的有效周期成功标记；只有 true 才收起高级抽屉，失败保留输入。 */ ok) => {
      // 校验通过且已触发搜索后才关闭抽屉，避免“校验失败仍关闭”导致用户误解
      if (ok) setDrawerVisible(false);
    });
  };

  /**
   * 复用普通重置入口，遵循同一忙碌锁和 resetFields 初始值规则。
   * @returns {void}
   */
  const handleDrawerReset = () => {
    handleReset();
  };

  /**
   * 按共享 Enter 规则分派普通或高级搜索，避免输入法确认、控件选项确认与按钮激活触发重复查询。
   * @param {React.KeyboardEvent} e 当前冒泡事件，命中搜索后阻止默认与继续冒泡。
   * @param {boolean} [isDrawer=false] true 使用成功后关闭高级抽屉的入口。
   * @returns {void} 非搜索场景保留控件自身行为。
   */
  const handleKeyDown = (
    /* `e`：当前字段冒泡的键盘事件；只消费共享规则允许的普通 Enter，先阻止默认与冒泡再搜索。 */ e,
    isDrawer = false
  ) => {
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
        {fieldsToRender.map(
          (
            /* `field`：本轮待渲染的字段配置，包含 name/label/rules/type 或自定义 component。 */ field,
            /* `index`：当前字段在待渲染组中的零起始位置，仅作为缺失 name 时的显示 key 兜底。 */ index
          ) => {
            // `fieldKey`：当前字段由 name 路径或下标生成的 React 标识，不作为提交字段名。
            const fieldKey = getSearchFormFieldKey(field?.name, index);
            // `hasLabel`：当前配置是否存在非空 label；决定是否保留固定标签宽度。
            const hasLabel = hasSearchFormFieldLabel(field);
            // 获取字段组件（根据 type 或 component）
            // `component`：宿主自定义节点或按 type 构造的输入节点；不在这里解析服务参数。
            const component = getFieldComponent(field);
            // 克隆 component 并确保它有唯一的 key
            // `clonedComponent`：合法 React 元素补 key 后的显示节点，其余返回值原样交给 React。
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
          }
        )}
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

    // `rendered`：宿主 toolBarRender 本轮返回的节点或数组；数组逐项包 Fragment 供统一展示。
    const rendered = toolBarRender();
    if (Array.isArray(rendered)) {
      return rendered.map(
        (
          /* `item`：工具栏数组中的当前节点；只加 Fragment，不接管其业务事件。 */ item,
          /* `index`：工具栏节点的零起始位置，作为当前声明序列的 key；动态重排应由宿主返回带 key 节点。 */ index
        ) => <React.Fragment key={index}>{item}</React.Fragment>
      );
    }
    return rendered;
  };

  if (!fields || fields.length === 0) {
    // 如果没有搜索字段，只显示工具栏，并保证 form 实例被挂载以消除 antd useForm 警告
    // `renderedToolBar`：无搜索字段时派生的工具栏节点；Form 仍挂载以连接父级实例。
    const renderedToolBar = renderToolbar();

    return (
      <div className={containerClassName} ref={containerRef}>
        {formInstance ? <Form form={formInstance} /> : null}
        <div className="toolbar-only">{renderedToolBar}</div>
      </div>
    );
  }

  // `hasMoreFields`：是否存在高级字段；为 false 时不创建展开入口和高级抽屉。
  const hasMoreFields = hiddenFields.length > 0;

  // 如果没有 formInstance，不渲染表单部分
  if (!formInstance && fields && fields.length > 0) {
    return null;
  }

  return (
    <div className={containerClassName} ref={containerRef}>
      {formInstance && (
        <Form
          form={formInstance}
          initialValues={initialValues}
          onKeyDown={(/* `e`：首行 Form 冒泡的键盘事件，按普通搜索路径判定，不当成高级抽屉提交。 */ e) =>
            handleKeyDown(e, false)
          }
        >
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
                    onClick={
                      /**
                       * 切换高级条件抽屉的局部显隐，不清空 Form 草稿，不直接触发搜索请求。
                       * @returns {void}
                       */ () => setDrawerVisible(!drawerVisible)
                    }
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
              <div
                onKeyDown={(/* `e`：高级抽屉内容冒泡的键盘事件；成功提交后才允许关闭抽屉。 */ e) =>
                  handleKeyDown(e, true)
                }
              >
                {renderFields(hiddenFields, true)}
              </div>
            </AdminDrawer>
          )}
        </Form>
      )}
    </div>
  );
};

export default SearchForm;

// ───── 模块结束：src/components/SearchForm/index.jsx ─────
