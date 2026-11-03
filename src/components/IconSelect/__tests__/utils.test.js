/**
 * @file src/components/IconSelect/__tests__/utils.test.js
 * @description IconSelect 共享 helper 测试，锁定图标筛选、分组与搜索过滤契约。
 */
import {
  ICON_SELECT_THEME_KEYS,
  ICON_SELECT_THEME_LABELS,
  filterIconNames,
  getSelectableIconNames,
  groupIconNamesByTheme,
} from '../utils';
describe('IconSelect utils', () => {
  it('should keep only ant icon names that match supported suffix themes', () => {
    expect(ICON_SELECT_THEME_KEYS).toEqual(['outlined', 'filled', 'twoTone']);
    expect(ICON_SELECT_THEME_LABELS.outlined).toBe('线框风格');
    expect(
      getSelectableIconNames(['AppstoreOutlined', 'SmileFilled', 'AlertTwoTone', 'createFromIconfontCN', 'default'])
    ).toEqual(['AppstoreOutlined', 'SmileFilled', 'AlertTwoTone']);
  });

  it('should group icon names by theme while keeping empty groups stable', () => {
    expect(groupIconNamesByTheme(['AppstoreOutlined', 'SmileFilled', 'AlertTwoTone', 'ApiOutlined'])).toEqual({
      outlined: ['AppstoreOutlined', 'ApiOutlined'],
      filled: ['SmileFilled'],
      twoTone: ['AlertTwoTone'],
    });
    expect(groupIconNamesByTheme(null)).toEqual({
      outlined: [],
      filled: [],
      twoTone: [],
    });
  });

  it('should filter icon names in a case-insensitive and trimmed way', () => {
    expect(filterIconNames(['AppstoreOutlined', 'ApiOutlined', 'SmileFilled'], ' api ')).toEqual(['ApiOutlined']);
    expect(filterIconNames(['AppstoreOutlined', 'ApiOutlined', 'SmileFilled'], 'OUTLINED')).toEqual([
      'AppstoreOutlined',
      'ApiOutlined',
    ]);
    expect(filterIconNames(['AppstoreOutlined'], '')).toEqual(['AppstoreOutlined']);
  });
});
