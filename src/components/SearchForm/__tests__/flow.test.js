/**
 * 模块职责：直接检查真实搜索规则的栅格分组、字段 key、选项收窄、变体和 Enter 接管条件。
 * 输入均是普通声明/事件替身，不创建表单或 DOM；输入法确认、控件选项确认和已处理事件应保留自身行为。
 * 首行超预算后的字段连续进入高级组，保持顺序而不丢失查询条件。
 */
// `SEARCH_FORM_DEFAULT_FIELD_SPAN`：普通字段默认占 6/24 栅格，允许 field.span 显式覆盖；与容器预算使用同一单位。
// `SEARCH_FORM_DRAWER_FIELD_SPAN`：高级抽屉字段基础占 12/24 栅格；xs/sm 的响应式覆盖由渲染层负责。
// `SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN`：首行默认总预算 24 栅格；窄容器可由组件缩小，超出项不丢弃。
// `getSearchFormContainerClassName`：按 card/embedded 变体生成根类名，嵌入表格时追加专用布局约束，查询协议保持一致。
// `getSearchFormFieldKey`：把字段名归一化为可稳定复用的 React key。
// `splitSearchFormFields`：把字段按首行展示与高级搜索抽屉拆分。
// `getSearchFormFieldSpan`：读取字段在当前布局下应使用的栅格宽度。
// `hasSearchFormFieldLabel`：判断字段是否应该渲染标签。
// `getSearchFormFieldOptions`：兜底读取 Select options，避免异常结构直接传给 antd Select。
// `getSearchFormMoreButtonText`：生成“展开更多搜索条件”按钮文案。
// `shouldTriggerSearchFormEnter`：判断本次 Enter 是否允许由搜索表单接管。
const {
  SEARCH_FORM_DEFAULT_FIELD_SPAN,
  SEARCH_FORM_DRAWER_FIELD_SPAN,
  SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN,
  getSearchFormContainerClassName,
  getSearchFormFieldKey,
  splitSearchFormFields,
  getSearchFormFieldSpan,
  hasSearchFormFieldLabel,
  getSearchFormFieldOptions,
  getSearchFormMoreButtonText,
  shouldTriggerSearchFormEnter,
} = require('../flow');

describe('SearchForm flow helpers', /**
 * 登记字段标识、栅格预算、抽屉分组与 Enter 接管规则，输入控件事件不由文本搜索猜测。
 * @returns {void}
 */ () => {
  /**
   * card/embedded 变体只决定显示类名，不改变搜索数据协议。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should build embedded and default container className', () => {
    expect(getSearchFormContainerClassName('embedded')).toBe('search-form-container search-form--embedded');
    expect(getSearchFormContainerClassName('card')).toBe('search-form-container');
  });

  /**
   * 嵌套字段路径组成稳定 key，缺少名称时使用明确下标兜底。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should normalize field key from nested name and fallback index', () => {
    expect(getSearchFormFieldKey(['shop', 'name'], 0)).toBe('shop.name');
    expect(getSearchFormFieldKey('', 3)).toBe('3');
  });

  /**
   * 按 24 栅格预算顺序保留首行字段，溢出后的所有字段进入高级组。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should split visible and hidden fields by max visible span', () => {
    // `fields`：6/6/12/6 栅格顺序的字段夹具，前 24 栅格可见，第四项必须留在高级组。
    const fields = [
      { name: 'keyword', span: 6 },
      { name: 'status', span: 6 },
      { name: 'dateRange', span: 12 },
      { name: 'channel', span: 6 },
    ];

    expect(splitSearchFormFields(fields, SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN)).toEqual({
      visibleFields: fields.slice(0, 3),
      hiddenFields: fields.slice(3),
    });
  });

  /**
   * 非法或空字段列表返回两组空数组，不在遍历阶段抛错。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should fallback to empty field groups when fields is invalid', () => {
    expect(splitSearchFormFields(null, SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN)).toEqual({
      visibleFields: [],
      hiddenFields: [],
    });
  });

  /**
   * 首行按字段 span 或默认值，抽屉使用统一跨度，保持两种布局契约。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should normalize field span for list row and drawer mode', () => {
    expect(getSearchFormFieldSpan({ span: 8 }, false)).toBe(8);
    expect(getSearchFormFieldSpan({}, false)).toBe(SEARCH_FORM_DEFAULT_FIELD_SPAN);
    expect(getSearchFormFieldSpan({ span: 20 }, true)).toBe(SEARCH_FORM_DRAWER_FIELD_SPAN);
  });

  /**
   * 空 label 不保留标签列，非法 options 返回安全空数组。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should normalize field label and select options', () => {
    expect(hasSearchFormFieldLabel({ label: '状态' })).toBe(true);
    expect(hasSearchFormFieldLabel({ label: '' })).toBe(false);
    expect(getSearchFormFieldOptions({ options: [{ label: '启用', value: 1 }] })).toEqual([
      { label: '启用', value: 1 },
    ]);
    expect(getSearchFormFieldOptions({ options: {} })).toEqual([]);
  });

  /**
   * 高级字段按钮文案与抽屉可见性/总数一致，不暗示额外查询动作。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should build more button text from drawer visibility', () => {
    expect(getSearchFormMoreButtonText(true, 5)).toBe('收起高级搜索');
    expect(getSearchFormMoreButtonText(false, 5)).toBe('展开更多搜索条件 (共 5 项)');
  });

  /**
   * 普通输入 Enter 可以搜索，文本域和其他按键保留原生行为。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('should only trigger enter search for non-textarea enter keydown', () => {
    expect(shouldTriggerSearchFormEnter({ key: 'Enter', target: { tagName: 'INPUT' } })).toBe(true);
    expect(shouldTriggerSearchFormEnter({ key: 'Enter', target: { tagName: 'TEXTAREA' } })).toBe(false);
    expect(shouldTriggerSearchFormEnter({ key: 'Escape', target: { tagName: 'INPUT' } })).toBe(false);
  });

  /**
   * 输入法、已消费事件、按钮、编辑区和选择/日期控件的 Enter 不被全局搜索接管。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('does not consume IME confirmation, handled events or control-owned Enter', () => {
    // ordinaryInput：普通单行字段的最小事件目标，用来区分全局搜索和控件自身的 Enter。
    // `ordinaryInput`：普通单行输入的最小事件目标，用同一对象区分 IME/已消费事件与真正搜索 Enter。
    const ordinaryInput = { tagName: 'INPUT' };
    expect(shouldTriggerSearchFormEnter({ key: 'Enter', isComposing: true, target: ordinaryInput })).toBe(false);
    expect(
      shouldTriggerSearchFormEnter({ key: 'Enter', nativeEvent: { isComposing: true }, target: ordinaryInput })
    ).toBe(false);
    expect(shouldTriggerSearchFormEnter({ key: 'Enter', keyCode: 229, target: ordinaryInput })).toBe(false);
    expect(shouldTriggerSearchFormEnter({ key: 'Enter', defaultPrevented: true, target: ordinaryInput })).toBe(false);
    expect(shouldTriggerSearchFormEnter({ key: 'Enter', target: { tagName: 'BUTTON' } })).toBe(false);
    expect(shouldTriggerSearchFormEnter({ key: 'Enter', target: { tagName: 'DIV', isContentEditable: true } })).toBe(
      false
    );
    expect(
      shouldTriggerSearchFormEnter({
        key: 'Enter',
        target: {
          tagName: 'INPUT',
          closest: /**
           * 模拟目标位于内部复合控件，返回非空祖先标记，使 Enter 交给选择器而非触发搜索。
           * @returns {Object}
           */ () => ({}),
        },
      })
    ).toBe(false);
    expect(shouldTriggerSearchFormEnter({ key: 'Enter', target: ordinaryInput })).toBe(true);
  });
});

// ───── 模块结束：src/components/SearchForm/__tests__/flow.test.js ─────
