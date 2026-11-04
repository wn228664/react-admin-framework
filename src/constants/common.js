/**
 * 模块职责：集中声明分页和通用界面常量，避免表格/表单各自选择不同默认值。
 * 这些值只表示客户端初始配置，服务端允许的分页范围与接口字段仍由接入层验证。
 */
// 可选超时参考值，单位毫秒；当前 HTTP 实例采用自己的 30000 毫秒，修改此值不会自动生效。
// `REQUEST_TIMEOUT`：供新请求适配器按需使用的可选超时基准 60000ms；当前 createHttpClient 固定 30000ms，不会自动读取它。
export const REQUEST_TIMEOUT = 60000; // 请求超时时间（毫秒）

// 可选固定尺寸基准，单位 CSS 像素；当前 ProTable 按父容器测量，不使用这些常量锁定高度。
// `TABLE_MIN_HEIGHT`：可选固定表格最小高度参考 300 CSS px；当前 ProTable 按真实父容器计算，不强制使用。
export const TABLE_MIN_HEIGHT = 300; // 表格最小高度
// `TABLE_DEFAULT_HEIGHT`：可选普通表格高度参考 500 CSS px；不能用它替代浮层和短窗口的剩余高度预算。
export const TABLE_DEFAULT_HEIGHT = 500; // 表格默认高度
// `TABLE_BOTTOM_PADDING`：可选表格底部留白参考 30 CSS px；当前 useTableHeight 按实际分页/footer 扣除。
export const TABLE_BOTTOM_PADDING = 30; // 表格底部安全距离
// `TABLE_DEBOUNCE_WAIT`：可选高度防抖参考 150ms；当前高度 Hook 使用帧合并，不读取该常量。
export const TABLE_DEBOUNCE_WAIT = 150; // 表格高度计算防抖时间

// PAGE_SIZE_DEFAULT 实际驱动 ProTable/flow；PAGE_SIZE_OPTIONS 供接入方显式配置分页选择器。
// `PAGE_SIZE_DEFAULT`：实际驱动 ProTable 初始请求与搜索重置的默认页容量 10；普通搜索保留当前容量。
export const PAGE_SIZE_DEFAULT = 10; // 默认每页条数
// `PAGE_SIZE_OPTIONS`：供接入方显式配置的页容量字符串目录；当前组件不自动将其覆盖到所有分页。
export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100']; // 每页条数选项

// 标签切换后的布局等待，单位毫秒；不用于请求超时或业务重试。
// `ANIMATION_DELAY`：标签定位等待 200ms，供新 DOM/视觉过渡稳定后测量；不参与网络重试或超时。
export const ANIMATION_DELAY = 200; // 动画延迟时间

// 标签容器显露当前项时的 CSS 像素留白，不是 window 的滚动距离。
// `SCROLL_MARGIN`：标签左右显露留白 20 CSS px，仅作用于横向标签滚动容器，不滚动 window。
export const SCROLL_MARGIN = 20; // 滚动边距

// ───── 模块结束：src/constants/common.js ─────
