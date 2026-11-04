/**
 * 模块职责：检查图标导出名的风格过滤、固定分组和大小写无关搜索，不实例化图标组件。
 * 名称列表均为测试文本；空/异常输入应保持可遍历结果，UI 选择与键盘行为另行验收。
 */
/**
 * `ICON_SELECT_THEME_KEYS`：固定 outlined/filled/twoTone 分组顺序，作为筛选和初始分组的共同目录。
 * `ICON_SELECT_THEME_LABELS`：固定风格键对应的中文 Tab 文案，不参与实际组件导出解析。
 * `filterIconNames`：按关键字过滤图标名称列表，保持大小写不敏感。
 * `getSelectableIconNames`：从图标 key 列表中过滤出菜单选择器允许展示的图标集合。
 * `groupIconNamesByTheme`：把可选图标名称按主题分组。
 */
import {
  ICON_SELECT_THEME_KEYS,
  ICON_SELECT_THEME_LABELS,
  filterIconNames,
  getSelectableIconNames,
  groupIconNamesByTheme,
} from '../utils';
describe('IconSelect utils', /**
 * 登记真实风格后缀、稳定分组和普通文本过滤用例，包含非法类型名称，UI 焦点不在本套件伪造。
 * @returns {void}
 */ () => {
  /**
   * 只保留三种真实风格后缀的图标名，排除工厂/default 等非图标导出。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('should keep only ant icon names that match supported suffix themes', () => {
    expect(ICON_SELECT_THEME_KEYS).toEqual(['outlined', 'filled', 'twoTone']);
    expect(ICON_SELECT_THEME_LABELS.outlined).toBe('线框风格');
    expect(
      getSelectableIconNames(['AppstoreOutlined', 'SmileFilled', 'AlertTwoTone', 'createFromIconfontCN', 'default'])
    ).toEqual(['AppstoreOutlined', 'SmileFilled', 'AlertTwoTone']);
    expect(getSelectableIconNames([null, 7, {}, 'ApiOutlined'])).toEqual(['ApiOutlined']);
  });

  /**
   * 三风格分组按固定键稳定返回，非法输入仍有三个独立空组。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
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
    expect(groupIconNamesByTheme([null, {}, 'ApiOutlined']).outlined).toEqual(['ApiOutlined']);
  });

  /**
   * 搜索去首尾空白且大小写无关，空词保留完整名称目录。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  it('should filter icon names in a case-insensitive and trimmed way', () => {
    expect(filterIconNames(['AppstoreOutlined', 'ApiOutlined', 'SmileFilled'], ' api ')).toEqual(['ApiOutlined']);
    expect(filterIconNames(['AppstoreOutlined', 'ApiOutlined', 'SmileFilled'], 'OUTLINED')).toEqual([
      'AppstoreOutlined',
      'ApiOutlined',
    ]);
    expect(filterIconNames(['AppstoreOutlined'], '')).toEqual(['AppstoreOutlined']);
    expect(filterIconNames([null, {}, 'ApiOutlined'], 'api')).toEqual(['ApiOutlined']);
  });
});

// ───── 模块结束：src/components/IconSelect/__tests__/utils.test.js ─────
