/**
 * @file src/styles/tokens.js
 * @description JS 侧 UI Token（颜色/圆角/间距），用于 inline style 等非 less 场景。
 * 约定：尽量与 src/styles/tokens.less 保持一致，避免出现同一语义多处硬编码导致风格漂移。
 */

export const APP_TOKENS = {
  colors: {
    primary: '#1890ff',
    primaryHover: '#40a9ff',
    bgLayout: '#f5f7fb',
    bgLayoutAlt: '#f0f2f5',
    surface: '#ffffff',
    surfaceMuted: '#fafafa',
    bgMuted: '#f5f5f5',
    bgSubtle: '#f2f2f2',
    border: '#f0f0f0',
    borderStrong: '#d9d9d9',
    borderMuted: '#ccc',
    borderLight: '#ddd',
    textPrimary: '#333',
    textRegular: '#666',
    textMuted: '#999',
    textSecondary: 'rgba(0, 0, 0, 0.65)',
    textTertiary: 'rgba(0, 0, 0, 0.45)',
    textQuaternary: '#bfbfbf',
    mask: 'rgba(0, 0, 0, 0.45)',
    hoverBg: 'rgba(0, 0, 0, 0.025)',
    primaryBg: '#e6f7ff',
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 10,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  glass: {
    card: {
      bg: 'rgba(255, 255, 255, 0.72)',
      bgHover: 'rgba(255, 255, 255, 0.82)',
      border: 'rgba(255, 255, 255, 0.58)',
      shadow: '0 8px 32px -8px rgba(0, 0, 0, 0.08)',
      filter: 'blur(20px) saturate(180%)',
    },
    float: {
      bg: 'rgba(255, 255, 255, 0.78)',
      bgHeader: 'rgba(255, 255, 255, 0.82)',
      bgFooter: 'rgba(255, 255, 255, 0.72)',
      border: 'rgba(255, 255, 255, 0.62)',
      shadow: '0 24px 80px -16px rgba(0, 0, 0, 0.18)',
      filter: 'blur(24px) saturate(190%)',
      mask: 'rgba(15, 23, 42, 0.32)',
    },
    popover: {
      bg: 'rgba(255, 255, 255, 0.82)',
      border: 'rgba(255, 255, 255, 0.58)',
      shadow: '0 12px 40px -8px rgba(0, 0, 0, 0.12)',
      filter: 'blur(16px) saturate(180%)',
    },
    tooltip: {
      bg: 'rgba(15, 23, 42, 0.85)',
      filter: 'blur(8px) saturate(150%)',
    },
    input: {
      bg: 'rgba(255, 255, 255, 0.68)',
      bgHover: 'rgba(255, 255, 255, 0.82)',
      bgFocus: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(0, 0, 0, 0.08)',
      borderHover: 'rgba(24, 144, 255, 0.32)',
      borderFocus: 'rgba(24, 144, 255, 0.48)',
      shadowFocus: '0 0 0 3px rgba(24, 144, 255, 0.12)',
    },
    btn: {
      bg: 'rgba(255, 255, 255, 0.72)',
      bgHover: 'rgba(255, 255, 255, 0.88)',
      border: 'rgba(0, 0, 0, 0.06)',
      shadow: '0 2px 8px -2px rgba(0, 0, 0, 0.08)',
      shadowHover: '0 4px 16px -4px rgba(0, 0, 0, 0.12)',
      primaryBg: 'rgba(24, 144, 255, 0.88)',
      primaryBgHover: 'rgba(24, 144, 255, 0.95)',
      primaryShadow: '0 4px 16px -4px rgba(24, 144, 255, 0.4)',
    },
    fallback: {
      bg: 'rgba(255, 255, 255, 0.95)',
      border: 'rgba(0, 0, 0, 0.08)',
    },
  },
};

// antd v5 主题 token（尽量与 src/styles/tokens.less 保持一致）
export const APP_ANTD_THEME_TOKEN = {
  colorPrimary: APP_TOKENS.colors.primary,
  colorLink: APP_TOKENS.colors.primary,
  colorBgLayout: APP_TOKENS.colors.bgLayout,
  colorBgContainer: APP_TOKENS.colors.surface, // 改回纯白，避免叠加
  colorBgElevated: '#ffffff', // 弹层用纯白
  colorBorder: APP_TOKENS.colors.border,
  colorBorderSecondary: APP_TOKENS.colors.border,
  colorTextSecondary: APP_TOKENS.colors.textSecondary,
  colorTextTertiary: APP_TOKENS.colors.textTertiary,
  colorBgMask: APP_TOKENS.glass.float.mask,
  colorPrimaryBg: APP_TOKENS.colors.primaryBg,
  borderRadius: APP_TOKENS.radius.md,
  borderRadiusSM: APP_TOKENS.radius.sm,
  borderRadiusLG: APP_TOKENS.radius.lg,
};

// antd v5 组件级 token（保守配置，避免透明叠加）
export const APP_ANTD_COMPONENTS_TOKEN = {
  Card: {
    colorBgContainer: '#ffffff', // 卡片用纯白
  },
  Modal: {
    contentBg: '#ffffff', // 弹窗用纯白
    headerBg: '#ffffff',
    footerBg: '#fafafa',
  },
  Drawer: {
    colorBgElevated: '#ffffff', // 抽屉用纯白
  },
  Popover: {
    colorBgElevated: '#ffffff', // 气泡用纯白
  },
  Dropdown: {
    colorBgElevated: '#ffffff', // 下拉菜单用纯白
  },
  Tooltip: {
    colorBgSpotlight: 'rgba(0, 0, 0, 0.85)', // 提示用深色
  },
  Button: {
    defaultBg: '#ffffff',
    defaultBorderColor: APP_TOKENS.colors.borderStrong,
  },
  Input: {
    colorBgContainer: '#ffffff',
    activeBorderColor: APP_TOKENS.colors.primary,
    hoverBorderColor: APP_TOKENS.colors.primaryHover,
  },
  Select: {
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
  },
  DatePicker: {
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
  },
  Table: {
    headerBg: APP_TOKENS.colors.surfaceMuted,
    rowHoverBg: 'rgba(24, 144, 255, 0.04)',
    rowSelectedBg: 'rgba(24, 144, 255, 0.08)',
    rowSelectedHoverBg: 'rgba(24, 144, 255, 0.12)',
  },
  Pagination: {
    itemBg: '#ffffff',
    itemActiveBg: APP_TOKENS.colors.primaryBg,
  },
};
