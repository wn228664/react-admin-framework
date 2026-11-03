/**
 * @file src/components/IconSelect/utils.js
 * @description IconSelect 共享 helper，统一处理可选图标筛选、主题分组与关键字过滤。
 * @example
 * const selectableIconNames = getSelectableIconNames(Object.keys(Icons));
 * const groupedIconNames = groupIconNamesByTheme(selectableIconNames);
 */
export const ICON_SELECT_THEME_SUFFIX_MAP = Object.freeze({
  outlined: 'Outlined',
  filled: 'Filled',
  twoTone: 'TwoTone',
});
export const ICON_SELECT_THEME_KEYS = Object.freeze(['outlined', 'filled', 'twoTone']);
export const ICON_SELECT_THEME_LABELS = Object.freeze({
  outlined: '线框风格',
  filled: '实底风格',
  twoTone: '双色风格',
});
/**
 * 从图标 key 列表中过滤出菜单选择器允许展示的图标集合。
 * @param {*} iconKeys Ant Design 图标导出的 key 列表。
 * @returns {string[]} 仅保留 Outlined/Filled/TwoTone 后缀的图标名称列表。
 */
export const getSelectableIconNames = (iconKeys) => {
  const stableIconKeys = Array.isArray(iconKeys) ? iconKeys : [];
  return stableIconKeys.filter((iconName) => {
    return ICON_SELECT_THEME_KEYS.some((themeKey) => {
      return iconName.endsWith(ICON_SELECT_THEME_SUFFIX_MAP[themeKey]);
    });
  });
};

/**
 * 把可选图标名称按主题分组。
 * @param {*} iconNames IconSelect 允许展示的图标名称列表。
 * @returns {{ outlined: string[], filled: string[], twoTone: string[] }} 主题分组后的图标列表。
 */
export const groupIconNamesByTheme = (iconNames) => {
  const groupedIconNames = ICON_SELECT_THEME_KEYS.reduce((iconNamesByTheme, themeKey) => {
    iconNamesByTheme[themeKey] = [];
    return iconNamesByTheme;
  }, {});
  const stableIconNames = Array.isArray(iconNames) ? iconNames : [];
  stableIconNames.forEach((iconName) => {
    const matchedThemeKey = ICON_SELECT_THEME_KEYS.find((themeKey) => {
      return iconName.endsWith(ICON_SELECT_THEME_SUFFIX_MAP[themeKey]);
    });
    if (matchedThemeKey) {
      groupedIconNames[matchedThemeKey].push(iconName);
    }
  });
  return groupedIconNames;
};

/**
 * 按关键字过滤图标名称列表，保持大小写不敏感。
 * @param {*} iconNames 待过滤的图标名称列表。
 * @param {*} searchText 搜索关键字。
 * @returns {string[]} 过滤后的图标名称列表。
 */
export const filterIconNames = (iconNames, searchText) => {
  const stableIconNames = Array.isArray(iconNames) ? iconNames : [];
  const normalizedSearchText = typeof searchText === 'string' ? searchText.trim().toLowerCase() : '';
  if (!normalizedSearchText) {
    return stableIconNames;
  }
  return stableIconNames.filter((iconName) => {
    return iconName.toLowerCase().includes(normalizedSearchText);
  });
};
