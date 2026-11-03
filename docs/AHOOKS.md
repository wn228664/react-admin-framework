# ahooks 接入与使用指南

当前 package.json 声明 ahooks ^3.7.8，package-lock.json 实际锁定 **3.9.7**。本轮沿用已有依赖，没有新增包或升级锁文件。官方在线文档在本轮查阅时为 3.11.0，使用新 API 前须同时检查当前锁定版本。

## 已在框架落地

| Hook | 使用位置 | 职责与边界 |
| --- | --- | --- |
| useAntdTable | ProTable | 查询、分页、表单联动与异步状态；服务适配返回 list/total。忽略旧结果不代表底层 HTTP 已停止。 |
| useSize | SearchForm | 跟随实际搜索容器 clientWidth 分配可见字段；窄容器折叠高级字段。不是 window 宽度断点，也不替换表格的高度预算。 |
| useEventListener | SearchForm | 监听 window resize，保留高度不足 500px 时折叠搜索的横屏策略。 |
| useEventListener | GlobalSearch | document 上的 Ctrl/Cmd+K，处理器读取最新回调，卸载时清理。 |
| useEventListener | FullscreenToggle | 一次注册标准与前缀全屏事件，浏览器退出时同步按钮状态，卸载时清理。 |

```jsx
const containerRef = useRef(null);
const size = useSize(containerRef);
useEventListener('keydown', onKeyDown, { target: () => document });
```

target 应指向实际 owner。KeepAlive 页面停用不等于卸载；页面专用监听应按活动状态配置 enable，或使用明确的停用清理。框架全局搜索和全屏控件位于始终活动的后台外壳。

SearchForm 的宽度预算继续以 900px 为界，并保留短视口策略。ProTable 的高度还需要扣除搜索、分页、footer 和容器内边距，并处理弹层动画结束；不能只用 useSize 的 height 代替这一预算，否则可能重新引入页面滚动或裁切。

## 值得按实际场景使用

| Hook | 适合场景 | 使用要求 |
| --- | --- | --- |
| useDebounceFn | 远程下拉联想、连续输入查询、较大菜单树检索 | 显式设置 wait，例如 250ms；关闭/停用时 cancel。不要给所有按钮加防抖，提交应有同步防重锁。当前只有两个示例菜单，无需人为增加输入延迟。 |
| useRequest | 详情、字典、独立查询等普通异步数据 | loading/data/error、manual、refresh 按接口配置；保持原始请求服务与业务解码边界。写操作手动触发，不擅自启用重试。 |
| useSelections | 稳定 ID 的批量选择、全选、半选、跨页选择 | 对象列表指定 itemKey；items 表示当前页集合。筛选变更、删除与权限变化后的选择清理由 owner 决定。clearAll 清空全部，unSelectAll 只处理当前 items。 |
| useMemoizedFn | 需要稳定函数引用并读取最新状态的事件回调 | 不代表缓存计算结果；不要替代依赖变化时应重跑的 effect。 |

没有真实页面使用点时直接从 ahooks 导入即可，不再包一层只改名或转发参数的 Hook。

## 请求取消与当前版本差异

useRequest.cancel 只忽略响应，不会停止底层 Promise/HTTP，网络中止仍需 AbortController 和请求服务支持。

**3.9.7 的被覆盖/取消 runAsync 调用在原请求结束后可能进入持续 pending 的 Promise。** 不要让必须释放的锁、弹窗确认或 finally 依赖该 Promise 必定结束。当前框架保留弹窗/搜索的任务门闩、AbortSignal 和代次控制，没有用 useLockFn 或 useRequest.cancel 替换它们。在线 3.11.0 文档中的 CancelledError / isCancelledError 行为不能直接假定在 3.9.7 可用。

useLockFn 适合简单的异步动作防重，但不提供关闭重开周期、取消信号或旧结果隔离。AdminModal / AdminDrawer / SearchForm 继续使用现有门闩；它们承担的契约更多。

## 状态与缓存

布局、菜单、权限、标签和主题已经有 Dva owner；不要再用 useLocalStorageState 创建同一份状态的第二来源。它可用于新页面独立、非敏感的偏好。凭证不放进 Hook 缓存或未经设计的 localStorage。

查询缓存键必须区分账号、权限和筛选条件，并有会话变更清理策略；通用框架不默认缓存业务响应。

## 维护与验证

改动已有组件后执行 npm run verify；响应式组件还要检查普通宽度、窄容器、短横屏和弹层内部布局。事件监听检查快捷键、浏览器状态变化以及卸载清理。新业务查询、批量操作和后端幂等需按真实契约另验。

官方参考：[useEventListener](https://ahooks.js.org/zh-CN/hooks/use-event-listener)、[useSize](https://ahooks.js.org/zh-CN/hooks/use-size)、[useRequest](https://ahooks.js.org/zh-CN/hooks/use-request/basic)、[useSelections](https://ahooks.js.org/hooks/use-selections)。
