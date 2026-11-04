/**
 * 模块职责：定义 JS 侧语义颜色、圆角、间距及 Antd 主题映射，供非 LESS 场景与根 ConfigProvider 共用。
 * 空间和圆角数值按 CSS 像素使用，颜色/透明度/模糊值保持原样；与 tokens.less 同步维护同名语义。
 * 这些对象是配置快照，不持有响应式主题状态；修改后需核对正文、浮层和对比度。
 */

// `APP_TOKENS`：框架 JS 侧的颜色、空间、圆角与可选材质配置快照；数值空间为 CSS px，和 LESS 同名语义保持一致。
export const APP_TOKENS = {
  // 颜色按用途命名，调用方优先使用语义键，不能把一种浅灰同时当正文和禁用文本。
  // `APP_TOKENS.colors`：语义颜色目录，与 LESS 颜色名对应，接入组件时按信息层级而非具体十六进制选择。
  colors: {
    // `APP_TOKENS.colors.primary`：框架交互主色，链接、主按钮和选中提示共用；与 JS 主题的 primary 保持一致。
    primary: '#1890ff',
    // `APP_TOKENS.colors.primaryHover`：主色交互的悬停强调层，帮助区分静态选中与指针反馈。
    primaryHover: '#40a9ff',
    // `APP_TOKENS.colors.bgLayout`：后台固定外壳底色，与实体 surface 正文卡片形成层级。
    bgLayout: '#f5f7fb',
    // `APP_TOKENS.colors.bgLayoutAlt`：布局渐变/分层的第二底色，供大面积外壳组合，不充当正文文字色。
    bgLayoutAlt: '#f0f2f5',
    // `APP_TOKENS.colors.surface`：可读正文与实体控件的白色表面，隔离底层玻璃叠色。
    surface: '#ffffff',
    // `APP_TOKENS.colors.surfaceMuted`：表头或次级实体表面底色，用轻微层级区分正文。
    surfaceMuted: '#fafafa',
    // `APP_TOKENS.colors.bgMuted`：低强调的中性区域背景，适合提示或占位区域。
    bgMuted: '#f5f5f5',
    // `APP_TOKENS.colors.bgSubtle`：比实体表面更深的轻背景预设，组合时需维持文字对比度。
    bgSubtle: '#f2f2f2',
    // `APP_TOKENS.colors.border`：默认弱边界色，用于相邻表面分隔，避免所有容器都出现重边框。
    border: '#f0f0f0',
    // `APP_TOKENS.colors.borderStrong`：需要明确识别的控件边界，和较浅内容分隔色分开。
    borderStrong: '#d9d9d9',
    // `APP_TOKENS.colors.borderMuted`：次级边界预设，供弱交互或装饰线按需使用。
    borderMuted: '#ccc',
    // `APP_TOKENS.colors.borderLight`：浅灰边界预设，组合背景时需核对可见性。
    borderLight: '#ddd',
    // `APP_TOKENS.colors.textPrimary`：主正文/标题的高强调文字色，关键信息优先使用。
    textPrimary: '#333',
    // `APP_TOKENS.colors.textRegular`：普通说明的次级文字色，保持与白色表面的可读对比。
    textRegular: '#666',
    // `APP_TOKENS.colors.textMuted`：低强调说明色，适合非关键信息；小字号需单独核对对比度。
    textMuted: '#999',
    // `APP_TOKENS.colors.textSecondary`：带透明度的第二层文字，最终对比随底色变化，使用前核对叠色。
    textSecondary: 'rgba(0, 0, 0, 0.65)',
    // `APP_TOKENS.colors.textTertiary`：带透明度的第三层提示文字，避免承担唯一的状态说明。
    textTertiary: 'rgba(0, 0, 0, 0.45)',
    // `APP_TOKENS.colors.textQuaternary`：最低强调文字/装饰预设，不能替代关键提示和操作名称。
    textQuaternary: '#bfbfbf',
    // `APP_TOKENS.colors.mask`：普通遮罩底色，透明度表达背景退后，焦点与关闭行为仍由弹层组件负责。
    mask: 'rgba(0, 0, 0, 0.45)',
    // `APP_TOKENS.colors.hoverBg`：极轻的中性悬停底色，保留原文字/图标的语义颜色。
    hoverBg: 'rgba(0, 0, 0, 0.025)',
    // `APP_TOKENS.colors.primaryBg`：主色的浅背景层，用于选中态；需同时保留图标或文字提示。
    primaryBg: '#e6f7ff',
  },
  // 圆角为 CSS 像素数，分别覆盖紧凑、常规和较大的容器。
  // `APP_TOKENS.radius`：圆角基准目录，值为 CSS px 数字，根 Antd 映射和局部组件共用。
  radius: {
    // `APP_TOKENS.radius.sm`：紧凑控件的 6px 圆角基准，与 JS radius.sm 同步。
    sm: 6,
    // `APP_TOKENS.radius.md`：常规容器的 8px 圆角基准，不改变其实际滚动高度。
    md: 8,
    // `APP_TOKENS.radius.lg`：较大容器的 10px 圆角基准，边缘裁切仍需由组件正确分配滚动区。
    lg: 10,
  },
  // 间距为 CSS 像素基准，布局还需按容器宽高收缩，不能以固定值锁死整页。
  // `APP_TOKENS.space`：间距基准目录，值为 CSS px 数字；实际布局仍允许按容器收缩。
  space: {
    // `APP_TOKENS.space.xs`：最小 4px 间隔，用于紧凑内部留白，不代替触控命中区域。
    xs: 4,
    // `APP_TOKENS.space.sm`：小号 8px 间隔，供相邻轻量元素布局使用。
    sm: 8,
    // `APP_TOKENS.space.md`：中号 12px 间隔，与 JS space.md 对齐，按容器可用宽度收缩。
    md: 12,
    // `APP_TOKENS.space.lg`：常规 16px 内容间隔，用于表面内边距或布局间隙。
    lg: 16,
    // `APP_TOKENS.space.xl`：大号 24px 内容间隔，窄窗口应允许组件覆盖以保留可用正文。
    xl: 24,
  },
  // 玻璃材质按 Card/浮层/提示等使用场景分组，透明背景需同时核对底层文字对比度。
  // `APP_TOKENS.glass`：可选材质预设目录；根主题的实体内容表面优先保证可读，透明效果按需接入。
  glass: {
    // `APP_TOKENS.glass.card`：卡片材质预设，包含普通/悬停表面、边界、阴影与背景滤镜。
    card: {
      // `APP_TOKENS.glass.card.bg`：可选卡片半透明表面；正文默认实体背景由根主题覆盖。
      bg: 'rgba(255, 255, 255, 0.72)',
      // `APP_TOKENS.glass.card.bgHover`：可选卡片悬停表面预设，不能当作自动可点击状态。
      bgHover: 'rgba(255, 255, 255, 0.82)',
      // `APP_TOKENS.glass.card.border`：可选卡片玻璃高光边界。
      border: 'rgba(255, 255, 255, 0.58)',
      // `APP_TOKENS.glass.card.shadow`：可选卡片的柔和投影，和浮层重阴影分开。
      shadow: '0 8px 32px -8px rgba(0, 0, 0, 0.08)',
      // `APP_TOKENS.glass.card.filter`：可选卡片背景模糊与饱和度，接入时需保证文本对比。
      filter: 'blur(20px) saturate(180%)',
    },
    // `APP_TOKENS.glass.float`：大型浮层材质预设，标题/正文/footer/遮罩分别设置，焦点管理仍归 UI 组件。
    float: {
      // `APP_TOKENS.glass.float.bg`：可选浮层玻璃正文底色；默认实体弹层样式保持清晰。
      bg: 'rgba(255, 255, 255, 0.78)',
      // `APP_TOKENS.glass.float.bgHeader`：可选浮层固定标题区的较高不透明度底色。
      bgHeader: 'rgba(255, 255, 255, 0.82)',
      // `APP_TOKENS.glass.float.bgFooter`：可选浮层固定操作区的底色，与滚动正文分层。
      bgFooter: 'rgba(255, 255, 255, 0.72)',
      // `APP_TOKENS.glass.float.border`：可选浮层外边界高光。
      border: 'rgba(255, 255, 255, 0.62)',
      // `APP_TOKENS.glass.float.shadow`：浮层与底层内容分离的较强投影预设。
      shadow: '0 24px 80px -16px rgba(0, 0, 0, 0.18)',
      // `APP_TOKENS.glass.float.filter`：可选大型浮层的背景模糊/饱和度。
      filter: 'blur(24px) saturate(190%)',
      // `APP_TOKENS.glass.float.mask`：浮层实际遮罩的暗色透明层，操作许可由 Modal/Drawer 管理。
      mask: 'rgba(15, 23, 42, 0.32)',
    },
    // `APP_TOKENS.glass.popover`：轻量弹出层材质预设，强度与 Modal/Drawer 分开。
    popover: {
      // `APP_TOKENS.glass.popover.bg`：可选轻量弹出层玻璃背景，默认实体表面由全局样式提供。
      bg: 'rgba(255, 255, 255, 0.82)',
      // `APP_TOKENS.glass.popover.border`：可选轻量弹出层边界高光。
      border: 'rgba(255, 255, 255, 0.58)',
      // `APP_TOKENS.glass.popover.shadow`：Popover/Dropdown 轻投影预设，弱于大型确认浮层。
      shadow: '0 12px 40px -8px rgba(0, 0, 0, 0.12)',
      // `APP_TOKENS.glass.popover.filter`：轻量弹出层的 16px 背景模糊与 180% 饱和度预设，接入前核对文字对比度。
      filter: 'blur(16px) saturate(180%)',
    },
    // `APP_TOKENS.glass.tooltip`：深色提示材质预设，需配合浅色文字保证可读。
    tooltip: {
      // `APP_TOKENS.glass.tooltip.bg`：深色 Tooltip 表面预设，正文应使用对应浅色文字。
      bg: 'rgba(15, 23, 42, 0.85)',
      // `APP_TOKENS.glass.tooltip.filter`：Tooltip 可选背景模糊/饱和度，文字可读性优先于透明效果。
      filter: 'blur(8px) saturate(150%)',
    },
    // `APP_TOKENS.glass.input`：输入控件普通/悬停/焦点材质预设，保留明确编辑位置。
    input: {
      // `APP_TOKENS.glass.input.bg`：可选输入控件普通玻璃表面。
      bg: 'rgba(255, 255, 255, 0.68)',
      // `APP_TOKENS.glass.input.bgHover`：输入控件悬停时更清晰的表面。
      bgHover: 'rgba(255, 255, 255, 0.82)',
      // `APP_TOKENS.glass.input.bgFocus`：输入焦点态接近实体的表面，帮助识别正在编辑的位置。
      bgFocus: 'rgba(255, 255, 255, 0.92)',
      // `APP_TOKENS.glass.input.border`：输入控件普通边界。
      border: 'rgba(0, 0, 0, 0.08)',
      // `APP_TOKENS.glass.input.borderHover`：输入控件悬停的主色边界。
      borderHover: 'rgba(24, 144, 255, 0.32)',
      // `APP_TOKENS.glass.input.borderFocus`：输入控件焦点主色边界，保留明确键盘焦点。
      borderFocus: 'rgba(24, 144, 255, 0.48)',
      // `APP_TOKENS.glass.input.shadowFocus`：输入焦点的外扩环预设，避免仅靠细边框表达焦点。
      shadowFocus: '0 0 0 3px rgba(24, 144, 255, 0.12)',
    },
    // `APP_TOKENS.glass.btn`：按钮材质预设，普通与主按钮分别表达强调层级。
    btn: {
      // `APP_TOKENS.glass.btn.bg`：可选普通按钮玻璃背景。
      bg: 'rgba(255, 255, 255, 0.72)',
      // `APP_TOKENS.glass.btn.bgHover`：普通按钮悬停的较高不透明度背景。
      bgHover: 'rgba(255, 255, 255, 0.88)',
      // `APP_TOKENS.glass.btn.border`：普通按钮的轻边界。
      border: 'rgba(0, 0, 0, 0.06)',
      // `APP_TOKENS.glass.btn.shadow`：普通按钮的轻投影。
      shadow: '0 2px 8px -2px rgba(0, 0, 0, 0.08)',
      // `APP_TOKENS.glass.btn.shadowHover`：按钮悬停的增强投影。
      shadowHover: '0 4px 16px -4px rgba(0, 0, 0, 0.12)',
      // `APP_TOKENS.glass.btn.primaryBg`：主按钮较高不透明度的主色表面。
      primaryBg: 'rgba(24, 144, 255, 0.88)',
      // `APP_TOKENS.glass.btn.primaryBgHover`：主按钮悬停更实的主色背景。
      primaryBgHover: 'rgba(24, 144, 255, 0.95)',
      // `APP_TOKENS.glass.btn.primaryShadow`：主按钮对应的主色柔和投影，只表达视觉强调。
      primaryShadow: '0 4px 16px -4px rgba(24, 144, 255, 0.4)',
    },
    // `APP_TOKENS.glass.fallback`：高不透明度的实体回退预设，保证背景滤镜不可用时仍能辨识边界。
    fallback: {
      // `APP_TOKENS.glass.fallback.bg`：高不透明度的实体回退表面，平台缺少背景模糊时优先保证文字可读。
      bg: 'rgba(255, 255, 255, 0.95)',
      // `APP_TOKENS.glass.fallback.border`：实体回退表面的中性边界，避免依赖透明高光才可辨识容器。
      border: 'rgba(0, 0, 0, 0.08)',
    },
  },
};

// antd v5 主题 token（尽量与 src/styles/tokens.less 保持一致）
// 根级 Antd token 映射与组件内 token 分开，统一品牌与通用语义。
// `APP_ANTD_THEME_TOKEN`：根 ConfigProvider 实际消费的 Antd 全局 token 映射，统一主色、背景、边界、文本与圆角；不是响应式主题 store。
export const APP_ANTD_THEME_TOKEN = {
  // `APP_ANTD_THEME_TOKEN.colorPrimary`：Antd 主交互色，映射框架 primary，影响主按钮与主要选中反馈。
  colorPrimary: APP_TOKENS.colors.primary,
  // `APP_ANTD_THEME_TOKEN.colorLink`：Antd 链接色，与框架主交互色统一，链接语义仍由实际节点提供。
  colorLink: APP_TOKENS.colors.primary,
  // `APP_ANTD_THEME_TOKEN.colorBgLayout`：Antd 布局底色，实体内容卡片在其上建立可读层级。
  colorBgLayout: APP_TOKENS.colors.bgLayout,
  // `APP_ANTD_THEME_TOKEN.colorBgContainer`：Antd 实体容器背景，使用 surface 避免正文叠加过多透明层。
  colorBgContainer: APP_TOKENS.colors.surface, // 实体背景保持文字清晰，不继承多层透明
  // `APP_ANTD_THEME_TOKEN.colorBgElevated`：Antd 浮层默认实体白色背景，优先保持文字与控件边界清晰。
  colorBgElevated: '#ffffff', // 弹层用纯白
  // `APP_ANTD_THEME_TOKEN.colorBorder`：Antd 基础边界映射，来自框架普通分隔色。
  colorBorder: APP_TOKENS.colors.border,
  // `APP_ANTD_THEME_TOKEN.colorBorderSecondary`：Antd 次级分隔边界映射，和框架普通边界保持一致。
  colorBorderSecondary: APP_TOKENS.colors.border,
  // `APP_ANTD_THEME_TOKEN.colorTextSecondary`：Antd 次级文字的透明色映射，最终对比与表面底色共同决定。
  colorTextSecondary: APP_TOKENS.colors.textSecondary,
  // `APP_ANTD_THEME_TOKEN.colorTextTertiary`：Antd 第三级提示文字映射，重要状态应另有明确文字/图标。
  colorTextTertiary: APP_TOKENS.colors.textTertiary,
  // `APP_ANTD_THEME_TOKEN.colorBgMask`：Antd 遮罩底色，来自浮层专用 mask，交互和焦点许可仍由组件控制。
  colorBgMask: APP_TOKENS.glass.float.mask,
  // `APP_ANTD_THEME_TOKEN.colorPrimaryBg`：Antd 主色浅背景映射，供选中和弱强调区域使用。
  colorPrimaryBg: APP_TOKENS.colors.primaryBg,
  // `APP_ANTD_THEME_TOKEN.borderRadius`：Antd 常规圆角，映射框架 md，单位 CSS px。
  borderRadius: APP_TOKENS.radius.md,
  // `APP_ANTD_THEME_TOKEN.borderRadiusSM`：Antd 紧凑圆角，映射框架 sm，单位 CSS px。
  borderRadiusSM: APP_TOKENS.radius.sm,
  // `APP_ANTD_THEME_TOKEN.borderRadiusLG`：Antd 大容器圆角，映射框架 lg，单位 CSS px。
  borderRadiusLG: APP_TOKENS.radius.lg,
};

// antd v5 组件级 token（保守配置，避免透明叠加）
// 组件级覆盖只影响 UI 库局部外观，不替代容器高度和滚动布局约束。
// `APP_ANTD_COMPONENTS_TOKEN`：根 ConfigProvider 实际消费的组件级覆盖；Card/浮层优先清晰不透明背景，滚动和尺寸继续由组件布局保证。
export const APP_ANTD_COMPONENTS_TOKEN = {
  // `APP_ANTD_COMPONENTS_TOKEN.Card`：卡片表面覆盖，长正文的滚动依然由 ScrollPanel/ProTable 分配。
  Card: {
    // `APP_ANTD_COMPONENTS_TOKEN.Card.colorBgContainer`：卡片实体白色表面，隔离底层布局叠色。
    colorBgContainer: '#ffffff', // 卡片用纯白
  },
  // `APP_ANTD_COMPONENTS_TOKEN.Modal`：确认弹窗的实体区域配色，标题/footer 的固定布局由 AdminModal 保证。
  Modal: {
    // `APP_ANTD_COMPONENTS_TOKEN.Modal.contentBg`：弹窗正文白色背景，保持表单与长内容可读。
    contentBg: '#ffffff', // 弹窗用纯白
    // `APP_ANTD_COMPONENTS_TOKEN.Modal.headerBg`：固定标题区白色背景，和滚动正文连接。
    headerBg: '#ffffff',
    // `APP_ANTD_COMPONENTS_TOKEN.Modal.footerBg`：固定操作区浅灰背景，突出可用按钮所在位置。
    footerBg: '#fafafa',
  },
  // `APP_ANTD_COMPONENTS_TOKEN.Drawer`：抽屉实体表面覆盖，body 滚动与确认动作由 AdminDrawer 保证。
  Drawer: {
    // `APP_ANTD_COMPONENTS_TOKEN.Drawer.colorBgElevated`：抽屉实体白色背景，避免表单字段叠色失去边界。
    colorBgElevated: '#ffffff', // 抽屉用纯白
  },
  // `APP_ANTD_COMPONENTS_TOKEN.Popover`：轻量 Popover 的实体背景覆盖。
  Popover: {
    // `APP_ANTD_COMPONENTS_TOKEN.Popover.colorBgElevated`：Popover 白色表面，选择器网格和文本保持可读。
    colorBgElevated: '#ffffff', // 气泡用纯白
  },
  // `APP_ANTD_COMPONENTS_TOKEN.Dropdown`：下拉菜单的实体背景覆盖。
  Dropdown: {
    // `APP_ANTD_COMPONENTS_TOKEN.Dropdown.colorBgElevated`：上下文菜单白色表面，活动/悬停项使用各自状态背景。
    colorBgElevated: '#ffffff', // 下拉菜单用纯白
  },
  // `APP_ANTD_COMPONENTS_TOKEN.Tooltip`：短说明 Tooltip 的深色背景覆盖。
  Tooltip: {
    // `APP_ANTD_COMPONENTS_TOKEN.Tooltip.colorBgSpotlight`：深色透明提示表面，与组件浅色提示文字配合。
    colorBgSpotlight: 'rgba(0, 0, 0, 0.85)', // 提示用深色
  },
  // `APP_ANTD_COMPONENTS_TOKEN.Button`：普通按钮的实体表面与边界覆盖；禁用/忙碌由组件状态决定。
  Button: {
    // `APP_ANTD_COMPONENTS_TOKEN.Button.defaultBg`：普通按钮白色背景，保留与布局表面的层级。
    defaultBg: '#ffffff',
    // `APP_ANTD_COMPONENTS_TOKEN.Button.defaultBorderColor`：普通按钮的明确边界，映射框架 borderStrong。
    defaultBorderColor: APP_TOKENS.colors.borderStrong,
  },
  // `APP_ANTD_COMPONENTS_TOKEN.Input`：输入框的实体底色及悬停/编辑边界覆盖。
  Input: {
    // `APP_ANTD_COMPONENTS_TOKEN.Input.colorBgContainer`：输入框白色表面，保持输入值和占位可区分。
    colorBgContainer: '#ffffff',
    // `APP_ANTD_COMPONENTS_TOKEN.Input.activeBorderColor`：输入焦点的主色边界，映射 primary。
    activeBorderColor: APP_TOKENS.colors.primary,
    // `APP_ANTD_COMPONENTS_TOKEN.Input.hoverBorderColor`：指针悬停的强调边界，映射 primaryHover。
    hoverBorderColor: APP_TOKENS.colors.primaryHover,
  },
  // `APP_ANTD_COMPONENTS_TOKEN.Select`：选择框与选项弹层的实体背景覆盖。
  Select: {
    // `APP_ANTD_COMPONENTS_TOKEN.Select.colorBgContainer`：选择框白色表面，已选文本由原生组件语义展示。
    colorBgContainer: '#ffffff',
    // `APP_ANTD_COMPONENTS_TOKEN.Select.colorBgElevated`：选择选项弹层的白色实体表面。
    colorBgElevated: '#ffffff',
  },
  // `APP_ANTD_COMPONENTS_TOKEN.DatePicker`：日期输入与日期面板的实体背景覆盖。
  DatePicker: {
    // `APP_ANTD_COMPONENTS_TOKEN.DatePicker.colorBgContainer`：日期输入白色表面，不改变日期值或时区契约。
    colorBgContainer: '#ffffff',
    // `APP_ANTD_COMPONENTS_TOKEN.DatePicker.colorBgElevated`：日期面板白色实体背景，保持可选日期清晰。
    colorBgElevated: '#ffffff',
  },
  // `APP_ANTD_COMPONENTS_TOKEN.Table`：表头、悬停和选择状态的表面配色；请求/排序逻辑不依赖颜色。
  Table: {
    // `APP_ANTD_COMPONENTS_TOKEN.Table.headerBg`：固定表头的弱灰实体背景，与正文区分。
    headerBg: APP_TOKENS.colors.surfaceMuted,
    // `APP_ANTD_COMPONENTS_TOKEN.Table.rowHoverBg`：普通行指针悬停的极浅主色底。
    rowHoverBg: 'rgba(24, 144, 255, 0.04)',
    // `APP_ANTD_COMPONENTS_TOKEN.Table.rowSelectedBg`：选择行的主色浅底，真实选择仍由 rowSelection 控制。
    rowSelectedBg: 'rgba(24, 144, 255, 0.08)',
    // `APP_ANTD_COMPONENTS_TOKEN.Table.rowSelectedHoverBg`：选择行叠加悬停时的较强主色底，和单纯 hover 区分。
    rowSelectedHoverBg: 'rgba(24, 144, 255, 0.12)',
  },
  // `APP_ANTD_COMPONENTS_TOKEN.Pagination`：分页普通页码与当前页的表面配色。
  Pagination: {
    // `APP_ANTD_COMPONENTS_TOKEN.Pagination.itemBg`：普通分页页码白色背景，当前页另用选中色。
    itemBg: '#ffffff',
    // `APP_ANTD_COMPONENTS_TOKEN.Pagination.itemActiveBg`：当前页码的主色浅底，映射框架 primaryBg。
    itemActiveBg: APP_TOKENS.colors.primaryBg,
  },
};

// ───── 模块结束：src/styles/tokens.js ─────
