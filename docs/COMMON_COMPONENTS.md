# 通用封装使用规范

## 页面与滚动边界

依赖方向：页面组合组件 → 通用状态/请求 → 接入方服务。组件不导入业务 service，不内置业务地址或成功码。

| 封装 | 固定区域 | 可滚动区域 |
| --- | --- | --- |
| BasicLayout / PageContainer | 顶栏、页签、页面标题 | 外层不滚动 |
| ScrollPanel | Card 标题 | Card body，适合长表单、上传列表和编辑器 |
| ProTable | 搜索区占位、表头、分页 | 表格正文；窄屏可横向滚动；极短视口搜索组件内部可滚动 |
| AdminModal | 弹窗标题、关闭按钮、footer | 正文 body；加载态保留 footer |
| AdminDrawer | 抽屉标题、关闭按钮、footer | 正文 body |
| SidebarMenu / TagsView | 导航布局 | 菜单纵向、标签横向 |

页面根使用 `PageContainer`，其 body 将剩余高度交给一个组件。多个区域用有明确比例的 Flex / Grid 分配高度，每个可伸缩子项设置 `min-height:0`。不要靠页面滚动兜底，也不要用外层隐藏溢出掩盖不可访问的内容。

```jsx
<PageContainer title="列表" extra={actions}>
  <ProTable columns={columns} request={loadItems} searchFields={fields} />
</PageContainer>
```

`ProTable` 根据所在容器的边界测量 scroll.y，不依赖 window 高度；容器、搜索项、分页及弹层动画结束时重新测量。它可以放入具有明确高度的弹窗或抽屉内部。

高度不超过 500px 时缩小表格留白；同时宽度不超过 500px 时折叠分页统计文本，保留页码和翻页按钮，避免统计文本换行后挤掉正文。窗口恢复后自动还原。对于更复杂的工具栏，接入方仍需按所在容器实际高度验证可达性。

## 请求与会话

默认导出是 `createHttpClient()` 的实例。认证请求只接受该实例固定 API 基址下的相对路径，不接受绝对/协议相对地址、反斜杠、空白/控制字符或单次覆盖 `baseURL`；不符合时以 `INVALID_PATH` 拒绝，不调用传输适配器。

```js
import request, { createHttpClient } from '@/utils/request';

const response = await request.get('/items', { signal });
// 由接入方根据真实接口契约判断 response，再映射为 { list, total }。

const publicClient = createHttpClient({ baseURL: 'https://static.example.org' });
await publicClient.get('/public.json', { authenticated: false, signal });
```

`authenticated: false` 不自动读取/附加应用凭证，不因公开资源 401 清理当前会话。它不移除调用方主动提供的 Authorization，也不能覆盖浏览器自身 Cookie/CORS 策略。`baseURL`、adapter 和显式 headers 均属于可信宿主配置，不接收未校验的用户输入。

默认超时 30000 毫秒；HTTP 失败、超时和取消均 reject；成功只返回 `response.data`，不猜 `code=200` 或其它业务码。`isSuccess(response, validate)` 也要求提供同步判定函数，且只有返回 `true` 才接受。

认证请求在发起时记录 token 和会话代次，交付成功/失败前再次核对；身份变化后统一以 `SESSION_CHANGED` 拒绝旧结果。`setToken/removeToken` 在变更开始时推进代次，同值 token 的重新登录、写存储失败也使旧请求失效。跨标签页 token 值变化可被发现；同值 token 的跨标签页代次不共享。当前会话 HTTP 401 才调用 `onUnauthorized`，默认移除 token。

框架没有完整登录或路由守卫，不会自动导航至登录页。Cookie 工具依赖浏览器可读的 Cookie，不等于服务端 HttpOnly/CSRF 安全方案；实际认证策略由接入项目确定。

## 表格与搜索

- `request({ current, pageSize, ...values })` 返回 `{ list, total }` 或兼容的 rows/total 结构。接入层负责校验业务成功；失败须 reject，不得伪装为空列表。组件显示错误并提供重试。
- 请求由 ahooks 管理，新请求产生后忽略旧结果；此机制不替代后端幂等，也不自动重试写操作。
- `rowKey` 默认 `id`，必须稳定；`pagination={false}` 关闭分页。`localSort` 只处理已加载数据，不代表全部远程数据排序。
- 排序与标题只依据显式列/路由配置，不对“合计”字段或某类业务 URL 做特殊处理。
- `actionRef.current` 提供 `reload(resetPage?)`、`submit()`、`reset()`、`getFieldsValue()`；owner 卸载时清空引用。
- `SearchForm` 接收父级 Form 实例；支持 input / select / dateRange / 自定义 component、rules、initialValue 和 fieldProps。窄容器收起更多字段到高级搜索抽屉，字段值由 Form 保留。
- 搜索按钮与 Enter 共用校验入口和同步动作锁；校验失败保留错误与输入；关闭抽屉/卸载后忽略迟到校验结果。异步 onSearch 拒绝时保留输入并展示错误。

## 弹窗与抽屉

`AdminModal` 是受控 open；`AdminDrawer` 是受控 open / onClose。确认回调为 `onOk(event, { signal })`，可返回 Promise。失败时显示错误、释放锁并保留内容，成功后的关闭由调用方控制。

```jsx
<AdminModal open={open} title="配置" onCancel={() => setOpen(false)}
  onOk={async (_event, { signal }) => {
    await onConfirm({ signal });
    if (!signal.aborted) setOpen(false);
  }}>
  {form}
</AdminModal>
```

同一打开周期只允许一个确认动作，连点不重复进入。默认提交期间关闭入口锁定；`cancelWhilePending` 允许取消。关闭、重新打开或卸载会中止信号并忽略旧结果/错误提示。调用方在 await 后自行写外部状态时也必须检查 `signal.aborted`。

`loading` 显示 body 骨架并禁用确认，保留 footer；`confirmLoading` 可额外控制确认状态。`footer={null}` 无底部；自定义 footer 的按钮锁由调用方负责。`onError` 可接管错误呈现。保留 Antd 的焦点、Esc、遮罩和 portal 行为；不要覆盖滚动布局相关样式。

静态 `utils/modal` 通过根 `AntdAppBridge` 使用 App 上下文，正文也限制为内部滚动；应用根挂载前不调用这些 helper。

## 文件上传

`UploadFile` 保留类型/大小/数量校验、多文件、拖拽、压缩、进度、回填、预览、下载和移除能力。

- 必须传 `uploadUrl` 或符合 Antd 协议的 `customRequest`；未配置时禁用。`customRequest` 如需取消，应返回 `{ abort() }`。
- `value` 为 URL 字符串或数组；`onChange` 在 `maxCount=1` 时回填字符串、清空为 `""`，其它数量时回填数组、清空为 `[]`。无 value 时可作为非受控组件。多个并发文件的受控回填保留其它上传中的文件。
- `dataPath` 或 `dataTransform(response)` 解析 URL，结果必须为非空字符串。`validateResponse(response)` 为同步业务校验：返回 true/undefined 表示接受，false/错误文案表示拒绝。不假设任何业务 code。
- `beforeUpload` 返回 false / Upload.LIST_IGNORE 拒绝；失败不触发成功回填。`maxSize` 单位 MiB（1024×1024 字节），当前要求文件严格小于上限；默认 maxCount=1、maxSize=20、fileType=image。`file/all` 不限制客户端 MIME，自定义 `acceptTypes` 优先；实际文件限制仍需服务端验证。
- 自动 Bearer 仅发送给与 API 基址同 origin 的明确上传目标；跨来源上传或只传 customRequest、没有 uploadUrl 时不自动附加应用 token。显式 headers 可为第三方存储提供其自己的授权；customRequest 不应自行转发应用凭证到其它地址。
- `imageCompression` 默认关闭，开启后只处理 JPEG/PNG/WebP，GIF/SVG 原样保留。宽高上限默认 1920px，不放大小图；quality 默认 0.8。浏览器编码格式回退时同时更新输出 MIME 与文件扩展名；压缩失败提示后回退原文件。
- 默认资源入口只接收 HTTP(S)、相对 URL、Blob 和 PNG/JPEG/GIF/WebP Base64；拒绝脚本、本地文件、HTML Data URL 和含用户名/密码的 URL。协议校验不保证远端内容安全或可达；自定义 onPreview/onDownload 接管后需自行维持该边界。
- `onRemove(file)` 可异步，返回 false 取消移除；同文件移除防重复。移除、清空和卸载会取消底层请求，忽略迟到状态；成功/失败回调按文件只处理一次。
- ref 只提供 `getFileList()` / `clearFiles()`；没有未实现的手动 upload 方法。清空同时取消上传并复位进度与 loading。
- 默认不显示下载；预览支持图片/视频，动作按钮可键盘操作。更复杂的媒体预览可通过 onPreview 注入。

组件验证页提供本地临时文件传输及失败开关，验证组件生命周期；真实上传地址、凭证、服务端文件限制及权限须由新服务接入并验证。

## 注释与维护

公开及关键私有封装记录参数、返回值、失败语义、受控边界及清理责任。依赖注释写清引入后的实际职责，状态说明记录 owner、单位和生命周期。实现注释解释滚动高度预算、异步代次、动画测量等原因；不写机械模板或“优化版/修复版”等标签。完整要求见 [代码与注释规范](CODE_QUALITY.md)。关键流程改动后执行 `npm run verify`，并复测对应组件的真实布局。
