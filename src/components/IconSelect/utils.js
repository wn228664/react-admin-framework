/**
 * 模块职责：从图标导出名中选择可渲染条目，按风格分组并执行普通文本筛选。
 * 这些函数不实例化图标、不改变导出表；空输入保留完整分组，由 UI 自己限制展示区域。
 */
// `ICON_SELECT_THEME_SUFFIX_MAP`：三种图标风格到 Antd 导出名后缀的冻结映射，不用外部文本拼动态模块路径。
export const ICON_SELECT_THEME_SUFFIX_MAP = Object.freeze({
  outlined: 'Outlined',
  filled: 'Filled',
  twoTone: 'TwoTone',
});
// `ICON_SELECT_THEME_KEYS`：固定 outlined/filled/twoTone 分组顺序，作为筛选和初始分组的共同目录。
export const ICON_SELECT_THEME_KEYS = Object.freeze(['outlined', 'filled', 'twoTone']);
// `ICON_SELECT_THEME_LABELS`：固定风格键对应的中文 Tab 文案，不参与实际组件导出解析。
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
  // `stableIconKeys`：图标导出名的可遍历数组；非数组回退空表，实际来源应为 Icons 命名空间键。
  const stableIconKeys = Array.isArray(iconKeys) ? iconKeys : [];
  return stableIconKeys.filter(
    (/* `iconName`：导出表当前名称，来源为字符串键；按固定后缀判断是否可在选择器展示。 */ iconName) => {
      return ICON_SELECT_THEME_KEYS.some(
        (/* `themeKey`：当前可选风格键，用来读取固定后缀，不承载用户输入。 */ themeKey) => {
          return typeof iconName === 'string' && iconName.endsWith(ICON_SELECT_THEME_SUFFIX_MAP[themeKey]);
        }
      );
    }
  );
};

/**
 * 把可选图标名称按主题分组。
 * @param {*} iconNames IconSelect 允许展示的图标名称列表。
 * @returns {{ outlined: string[], filled: string[], twoTone: string[] }} 主题分组后的图标列表。
 */
export const groupIconNamesByTheme = (iconNames) => {
  // `groupedIconNames`：本次调用新建的三组名称数组，只保存名称不实例化组件。
  const groupedIconNames = ICON_SELECT_THEME_KEYS.reduce(
    (
      /* `iconNamesByTheme`：reduce 本次新建的分组累加器；为每个固定风格初始化独立数组。 */ iconNamesByTheme,
      /* `themeKey`：初始化分组时的固定风格键，沿 ICON_SELECT_THEME_KEYS 顺序。 */ themeKey
    ) => {
      iconNamesByTheme[themeKey] = [];
      return iconNamesByTheme;
    },
    {}
  );
  // `stableIconNames`：待分组名称数组，非数组按空表；不改变宿主传入数组。
  const stableIconNames = Array.isArray(iconNames) ? iconNames : [];
  stableIconNames.forEach((/* `iconName`：待分组的当前导出名称，只放进首个匹配后缀的组。 */ iconName) => {
    // `matchedThemeKey`：当前名称命中的第一种后缀风格；没有匹配时忽略该导出。
    const matchedThemeKey = ICON_SELECT_THEME_KEYS.find(
      (/* `themeKey`：当前分组探测候选风格键；不是动态模块或远端配置。 */ themeKey) => {
        return typeof iconName === 'string' && iconName.endsWith(ICON_SELECT_THEME_SUFFIX_MAP[themeKey]);
      }
    );
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
  // `stableIconNames`：待搜索名称数组；空关键词直接返回此引用，非空搜索返回新数组。
  const stableIconNames = Array.isArray(iconNames) ? iconNames : [];
  // `normalizedSearchText`：去首尾空白并转小写的搜索词，非字符串为空串，执行普通子串匹配。
  const normalizedSearchText = typeof searchText === 'string' ? searchText.trim().toLowerCase() : '';
  if (!normalizedSearchText) {
    return stableIconNames;
  }
  return stableIconNames.filter(
    (/* `iconName`：待过滤的当前名称，转小写后与搜索词做 includes，不改变原名。 */ iconName) => {
      return typeof iconName === 'string' && iconName.toLowerCase().includes(normalizedSearchText);
    }
  );
};

// ───── 模块结束：src/components/IconSelect/utils.js ─────
