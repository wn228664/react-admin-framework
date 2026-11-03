/**
 * @file src/constants/common.js
 * @description 全局通用常量，集中管理请求超时、表格高度、分页配置、动画延迟等系统级参数，便于统一调整和维护。
 */
/**
 * 通用常量定义
 */

// 请求相关
export const REQUEST_TIMEOUT = 60000; // 请求超时时间（毫秒）

// 表格相关
export const TABLE_MIN_HEIGHT = 300; // 表格最小高度
export const TABLE_DEFAULT_HEIGHT = 500; // 表格默认高度
export const TABLE_BOTTOM_PADDING = 30; // 表格底部安全距离
export const TABLE_DEBOUNCE_WAIT = 150; // 表格高度计算防抖时间

// 分页相关
export const PAGE_SIZE_DEFAULT = 10; // 默认每页条数
export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100']; // 每页条数选项

// 动画相关
export const ANIMATION_DELAY = 200; // 动画延迟时间

// Dashboard 相关

// 滚动相关
export const SCROLL_MARGIN = 20; // 滚动边距

// 资源路径
