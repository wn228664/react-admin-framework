/**
 * @file src/components/SearchForm/__tests__/flow.test.js
 * @description SearchForm flow helper 单元测试：锁定字段分组、字段归一化和 Enter 搜索判定等行为。
 */
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

describe('SearchForm flow helpers', () => {
  test('should build embedded and default container className', () => {
    expect(getSearchFormContainerClassName('embedded')).toBe('search-form-container search-form--embedded');
    expect(getSearchFormContainerClassName('card')).toBe('search-form-container');
  });

  test('should normalize field key from nested name and fallback index', () => {
    expect(getSearchFormFieldKey(['shop', 'name'], 0)).toBe('shop.name');
    expect(getSearchFormFieldKey('', 3)).toBe('3');
  });

  test('should split visible and hidden fields by max visible span', () => {
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

  test('should fallback to empty field groups when fields is invalid', () => {
    expect(splitSearchFormFields(null, SEARCH_FORM_DEFAULT_MAX_VISIBLE_SPAN)).toEqual({
      visibleFields: [],
      hiddenFields: [],
    });
  });

  test('should normalize field span for list row and drawer mode', () => {
    expect(getSearchFormFieldSpan({ span: 8 }, false)).toBe(8);
    expect(getSearchFormFieldSpan({}, false)).toBe(SEARCH_FORM_DEFAULT_FIELD_SPAN);
    expect(getSearchFormFieldSpan({ span: 20 }, true)).toBe(SEARCH_FORM_DRAWER_FIELD_SPAN);
  });

  test('should normalize field label and select options', () => {
    expect(hasSearchFormFieldLabel({ label: '状态' })).toBe(true);
    expect(hasSearchFormFieldLabel({ label: '' })).toBe(false);
    expect(getSearchFormFieldOptions({ options: [{ label: '启用', value: 1 }] })).toEqual([
      { label: '启用', value: 1 },
    ]);
    expect(getSearchFormFieldOptions({ options: {} })).toEqual([]);
  });

  test('should build more button text from drawer visibility', () => {
    expect(getSearchFormMoreButtonText(true, 5)).toBe('收起高级搜索');
    expect(getSearchFormMoreButtonText(false, 5)).toBe('展开更多搜索条件 (共 5 项)');
  });

  test('should only trigger enter search for non-textarea enter keydown', () => {
    expect(shouldTriggerSearchFormEnter({ key: 'Enter', target: { tagName: 'INPUT' } })).toBe(true);
    expect(shouldTriggerSearchFormEnter({ key: 'Enter', target: { tagName: 'TEXTAREA' } })).toBe(false);
    expect(shouldTriggerSearchFormEnter({ key: 'Escape', target: { tagName: 'INPUT' } })).toBe(false);
  });
});
