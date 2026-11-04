/**
 * 模块职责：封装 Antd 文件选择、校验、可选压缩、传输、URL 回填和本地预览/下载入口。
 * 父级可持有 value，组件持有文件状态与当前选择周期；移除、清空、卸载后旧回调不能恢复文件。
 * 业务上传地址与响应校验必须由接入方提供；自动凭证只用于明确的同 API 来源，资源 URL 不接受可执行协议。
 */
// React 引用保存同步周期与每文件去重集合，state 负责文件列表/进度/预览，ref 只暴露明确能力。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 * `useImperativeHandle`：将父级 ref 限定为组件公开能力，不暴露内部可变集合或传输实例。
 * `forwardRef`：接收父级能力引用并交给组件受控方法；不会自动管理请求或资源清理。
 * `useMemo`：按声明依赖派生配置/视图，不能作为永不丢失的业务状态或副作用所有者。
 * `useRef`：保存跨渲染 owner、DOM 或任务身份；写 current 不会触发重渲染，清理由配对生命周期负责。
 * `useCallback`：按依赖保持回调引用供消费者使用；回调中的当前值仍遵循 React 闭包语义。
 */
import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo, useRef, useCallback } from 'react';
// 拖拽入口与普通选择区域共享加号视觉，是否可操作由 Upload 的传输配置与禁用状态决定。
/**
 * `PlusOutlined`：新增文件入口的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import { PlusOutlined } from '@ant-design/icons';
// Upload 负责文件传输生命周期，message 报告当前失败，theme 提供组件语义颜色。
/**
 * `Upload`：负责文件选择和传输事件；校验、响应成功与安全 URL 由本组件显式判定。
 * `message`：通过根桥显示公开反馈，不应直接消费原始请求配置或敏感响应。
 * `theme`：读取当前 Antd 语义颜色，供上传按钮与帮助文字随根主题同步显示。
 */
import { Upload, message, theme } from 'antd';
// 只在明确同 API 来源时使用当前凭证；未知 customRequest 目标不自动携带应用 Token。
/**
 * `getToken`：读取当前会话值；浏览器禁止 Cookie 或 API 抛错时保持未认证态。
 */
import { getToken } from '@/utils/auth';
// 诊断走统一入口；注入的错误对象应先由服务层公开化，禁止输出凭证或敏感响应。
/**
 * `logger`：提供统一诊断入口；warn/error 在生产仍可能输出，调用前必须移除秘密和原始响应。
 */
import logger from '@/utils/logger';
// 上传 URL 的环境前缀来自同一公开 API 基址，不在页面硬编码业务地址。
/**
 * `getApiBaseUrl`：读取 Umi 构建期注入的公开 API 基址，组件和上传入口共用此来源。
 * `getMsg`：只选择公开文本错误文案，解析器抛出的对象 message 不得进入提示组件。
 */
import { getApiBaseUrl, getMsg } from '@/utils/robust';
// 纯 helper 统一类型/大小、来源、资源协议、列表状态和响应 URL 提取。
/**
 * `buildUploadFileListWithResolvedUrl`：只更新目标文件的 url / thumbUrl，保持其他文件条目不变。
 * `buildUploadSizeErrorMessage`：生成文件大小校验失败提示文案。
 * `buildUploadTypeErrorMessage`：生成文件类型校验失败提示文案。
 * `buildUploadFileList`：把外部 value 归一化后的 URL 列表转换成 antd Upload 需要的 fileList。
 * `collectUploadedUrls`：收集已上传成功文件的 URL 列表，统一单文件/多文件回传口径。
 * `extractUrlFromUploadResponse`：从上传响应中提取文件 URL，兼容 path 字符串、path 函数和常见后端响应兜底字段。
 * `normalizeValueToUrls`：把受控字符串/数组转成安全资源 URL 列表，忽略空值和不允许的协议。
 * `removeUploadFileByUid`：从 fileList 中移除指定 uid 的文件。
 * `removeUploadProgressByUid`：删除某个文件对应的上传进度记录。
 * `resolveAcceptAttr`：为文件选择器产生 accept 文本，显式非空 accept 优先。
 * `resolveAcceptMimeTypes`：优先使用显式 MIME 表，否则读取分类预设；file/all 分类不限制 MIME。
 * `resolveUploadFileAsset`：从上传组件 file 对象里提取可复用的预览/下载目标数据。
 * `resolveUploadHeaders`：仅在明确上传目标与 API 基址同 origin 时自动附加应用 Bearer。
 * `resolveUploadResponseErrorMessage`：解析上传响应里的错误文案；返回空字符串代表可以继续走成功链路。
 * `resolveUploadUrl`：组合 API 基址与上传路径，明确的 HTTP(S) 目标保持原值。
 */
import {
  buildUploadFileListWithResolvedUrl,
  buildUploadSizeErrorMessage,
  buildUploadTypeErrorMessage,
  buildUploadFileList,
  collectUploadedUrls,
  extractUrlFromUploadResponse,
  normalizeValueToUrls,
  removeUploadFileByUid,
  removeUploadProgressByUid,
  resolveAcceptAttr,
  resolveAcceptMimeTypes,
  resolveUploadFileAsset,
  resolveUploadHeaders,
  resolveUploadResponseErrorMessage,
  resolveUploadUrl,
} from './utils';
// 预览复用内部滚动弹窗，图片/视频与默认上传行为分开。
/**
 * `PreviewModal`：只展示已校验媒体地址，关闭释放媒体节点而不删除远端文件。
 */
import PreviewModal from './components/PreviewModal';
// 选择按钮只展示 busy 和提示文本，实际入口仍归 Antd Upload。
/**
 * `UploadButton`：只显示上传入口文案与等待图标，实际选择/禁用归外层 Upload。
 */
import UploadButton from './components/UploadButton';
// 压缩仅处理静态位图，并以浏览器实际输出 MIME 命名文件。
/**
 * `compressImage`：缩小 JPEG/PNG/WebP 静态图，按浏览器实际 MIME 命名；GIF/SVG 保留，失败拒绝给上传 owner。
 */
import { compressImage } from './components/compressImage';
// 列表渲染把预览/下载/移除回调接回当前 owner，不持有第二份文件状态。
/**
 * `createUploadItemRender`：捕获当前上传快照并构造 Antd 列表项渲染器；不创建第二个文件 owner。
 */
import { createUploadItemRender } from './components/uploadItemRender';
// 上传框尺寸通过 CSS 变量传入，正文和操作在组件内布局。
import './index.less';
/**
 * 提供受控或非受控上传视图；未配置 uploadUrl/customRequest 时禁用选择上传。
 * @param {Object} props 配置由宿主页面声明，组件不猜后端成功信封。
 * @param {string|string[]} [props.value] 当前资源 URL；undefined 使用内部列表。
 * @param {Function} [props.onChange] maxCount=1 回填字符串，否则回填 URL 数组；清空分别为 ""/[]。
 * @param {boolean} [props.disabled=false] 同时禁止新增与默认移除。
 * @param {string} [props.className=""] 追加到上传外层的类名。
 * @param {Object} [props.style={}] 上传外层样式，父容器仍需提供有界空间。
 * @param {number} [props.maxCount=1] 最多文件数；multiple 只有在大于 1 时启用。
 * @param {number} [props.maxSize=20] 单文件上限，单位 MiB；当前判定要求严格小于该值。
 * @param {string} [props.fileType=image] image/video/audio/document/file/all 分类。
 * @param {string[]} [props.acceptTypes] 优先于分类的 MIME 校验表；accept 只控制选择器提示。
 * @param {string} [props.accept] 原生文件选择器提示，默认由 fileType 产生，不能代替内容校验。
 * @param {string} [props.uploadUrl] 相对 API 路径或明确 HTTP(S) 上传地址；跨来源不自动传应用 Token。
 * @param {Object} [props.uploadData={}] 上传表单额外字段，不预置业务参数。
 * @param {Object} [props.headers] 调用方明确授权的请求头，优先于自动 Bearer。
 * @param {string} [props.method=POST] 传给 Upload 的传输方法。
 * @param {string} [props.fieldName=file] multipart 表单中的文件字段名。
 * @param {boolean} [props.withCredentials=false] 是否由浏览器携带目标 Cookie，调用方承担跨来源授权。
 * @param {number} [props.width=104] 上传框 CSS 像素宽，窄屏样式可进一步缩小显示尺寸。
 * @param {number} [props.height=104] 上传框 CSS 像素高，窄屏样式可进一步缩小显示尺寸。
 * @param {string} [props.listType=picture-card] Antd 内建列表样式，支持 picture/text。
 * @param {string} [props.placeholder=上传] 选择入口文本。
 * @param {string} [props.tips=""] 上传区域底部说明。
 * @param {boolean} [props.multiple=false] 是否允许一次选择多份；仍受 maxCount 限制。
 * @param {boolean} [props.showFileList=true] 文件列表可见性。
 * @param {boolean} [props.showProgress=true] 上传进度可见性，进度由 uid 分别记录。
 * @param {boolean} [props.showPreview=true] 默认预览开关。
 * @param {boolean} [props.showDownload=false] 默认下载入口开关。
 * @param {boolean} [props.showRemove=true] 默认移除开关，disabled 时仍不可移除。
 * @param {boolean} [props.draggable=false] 使用 Antd 拖拽选择区域。
 * @param {boolean} [props.imageCompression=false] 仅压缩 JPEG/PNG/WebP，GIF/SVG 保留原文件。
 * @param {number} [props.imageCompressionQuality=0.8] 浏览器编码质量 0..1，是否生效取决于输出格式。
 * @param {number} [props.imageCompressionMaxWidth=1920] 压缩最大像素宽，必须为正整数。
 * @param {number} [props.imageCompressionMaxHeight=1920] 压缩最大像素高，必须为正整数。
 * @param {Function} [props.beforeUpload] 可异步；false/LIST_IGNORE 拒绝当前文件，关闭后迟到结果忽略。
 * @param {Function} [props.onRemove] 可异步，返回 false 保留文件；同 uid 同时只执行一次。
 * @param {Function} [props.customRequest] 遵循 Antd 请求协议；要支持取消需返回 {abort()}。
 * @param {Function} [props.onSuccess] 当前有效文件成功后的 (response,file) 通知，业务校验须先通过。
 * @param {Function} [props.onError] 当前文件失败后的 (error,file) 通知。
 * @param {Function} [props.onProgress] (percent,file) 仅观察传输进度，百分比不是业务成功状态。
 * @param {Function} [props.onUploadStart] 单文件首次进入传输时接收 file。
 * @param {Function} [props.onUploadEnd] 单文件首次结束/取消时接收 file，与开始通知按 uid 配对。
 * @param {Function} [props.onPreview] 接管 (file) 预览，需自行限制目标与协议。
 * @param {Function} [props.onDownload] 接管 (file) 下载，需自行限制目标与协议。
 * @param {string|Function} [props.dataPath=data.link] 返回字段路径或同步 (response) 解析函数。
 * @param {Function} [props.dataTransform] 同步 (response) 返回资源 URL，优先于 dataPath。
 * @param {Function} [props.validateResponse] 同步返回 true/undefined 接受，false/错误文本拒绝。
 * @param {React.ReactNode} [props.children] 自定义选择入口，传输配置和 disabled 仍约束是否可操作。
 * @returns {React.ReactElement} 列表、选择入口和受控预览；ref 提供 clearFiles/getFileList。
 * 通知回调应同步且不抛错；组件不承诺回滚远端副作用。清空会先取消传输再回填空值。
 * @example <UploadFile uploadUrl="/files" value={url} onChange={setUrl} validateResponse={acceptUpload} />
 */
const UploadFile = forwardRef(
  (props, /* `ref`：父级可选能力引用，仅暴露 clearFiles/getFileList；不暴露内部集合或 rc-upload 实例。 */ ref) => {
    // `antdToken`：当前主题的语义颜色对象，仅用于选择入口与提示文字；与网络认证 token 无关。
    const { token: antdToken } = theme.useToken();
    // `customHeaders`：props.headers 的本地别名；显式凭证优先于自动 Bearer，跨源头部必须由宿主授权。
    // `customBeforeUpload`：props.beforeUpload 的本地别名，在 MIME/大小校验前等待宿主判断；迟到结果受选择周期限制。
    // `customPreview`：props.onPreview 的接管函数；存在时不进入默认资源预览流程。
    // `customDownload`：props.onDownload 的接管函数；存在时由宿主负责下载来源与失败反馈。
    // `customRemove`：props.onRemove 的异步许可函数；返回 false 保留文件，等待期间同 uid 禁止再次删除。
    // `customSuccess`：props.onSuccess 的同步通知，只有当前文件通过业务校验并取得 URL 后调用。
    // `customError`：props.onError 的同步失败通知，参数可能是传输错误、业务拒绝或解析失败。
    // `customProgress`：props.onProgress 的同步观察通知，收到百分比和文件，不代表业务完成。
    const {
      // 基础配置
      value,
      onChange,
      disabled = false,
      className = '',
      style = {},

      // 文件限制
      maxCount = 1,
      maxSize = 20,
      fileType = 'image',
      acceptTypes,
      accept,

      // 上传配置
      uploadUrl = '',
      uploadData = {},
      headers: customHeaders,
      method = 'POST',
      fieldName = 'file',
      withCredentials = false,

      // 显示配置
      width = 104,
      height = 104,
      listType = 'picture-card',
      placeholder = '上传',
      tips = '',
      multiple = false,
      showFileList = true,
      showProgress = true,

      // 功能配置
      showPreview = true,
      showDownload = false,
      showRemove = true,
      draggable = false,
      imageCompression = false,
      imageCompressionQuality = 0.8,
      imageCompressionMaxWidth = 1920,
      imageCompressionMaxHeight = 1920,

      // 回调函数
      beforeUpload: customBeforeUpload,
      onPreview: customPreview,
      onDownload: customDownload,
      onRemove: customRemove,
      onSuccess: customSuccess,
      onError: customError,
      onProgress: customProgress,
      onUploadStart,
      onUploadEnd,
      customRequest,

      // 响应数据配置
      dataPath = 'data.link',
      dataTransform,
      validateResponse,
      children,
    } = props;

    // 当前已展示文件与进行中状态；受控 value 回填时保留其他仍在上传的文件。
    // `fileList`：当前可见的 Antd 文件状态数组，初始为空；合并受控 URL 回填时保留其它上传中条目。
    // `setFileList`：提交本组件可见文件快照；受控 value 回填与传输事件共用它，不修改父级数组。
    const [fileList, setFileList] = useState([]);
    // 清空会同时更新 React key 与逻辑 revision，取消已排队但尚未执行的 beforeUpload。
    // `uploadCycle`：当前选择周期的 React key，初始 0；清空递增以卸载旧传输 owner，并使旧异步校验失效。
    // `setUploadCycle`：清空时递增组件 key，使旧 rc-upload owner 卸载并取消旧选择处理。
    const [uploadCycle, setUploadCycle] = useState(0);
    // 预览开关、资源地址、标题和类型只属于当前组件；关闭时主动清空资源引用。
    // `previewVisible`：当前媒体预览弹窗是否打开，初始 false；不是文件是否已上传的判断。
    // `setPreviewVisible`：控制当前资源预览弹窗；关闭只释放视图引用，不删除远端文件。
    const [previewVisible, setPreviewVisible] = useState(false);
    // `previewImage`：当前安全媒体预览地址，初始空串；图片和视频复用它，关闭后释放引用。
    // `setPreviewImage`：保存当前经过资源协议检查的预览地址；关闭弹窗时置空。
    const [previewImage, setPreviewImage] = useState('');
    // `previewTitle`：当前预览资源的显示标题，初始空串；关闭时清空，不作为资源身份。
    // `setPreviewTitle`：保存当前文件展示名；关闭时置空，不能作为资源身份。
    const [previewTitle, setPreviewTitle] = useState('');
    // `previewType`：当前预览分类 image/video/other，初始 image；打开资源时按 helper 结果更新。
    // `setPreviewType`：发布 image/video/other 资源分类，决定预览元素类型，不参与上传 MIME 校验。
    const [previewType, setPreviewType] = useState('image');
    // loading 表示至少一个文件在传输，实际并发数量以 activeUploadUidSetRef 为准。
    // `setLoading`：发布至少一份文件仍在上传的展示状态，真实计数以 uid 集合为准。
    const [loading, setLoading] = useState(false);
    // 进度按 uid 记录百分比，文件结束/移除/清空时删除，不把 HTTP 完成当业务成功。
    // `uploadProgress`：按文件 uid 索引的百分比字典，初始空对象；完成、失败、移除和清空均清理对应项。
    // `setUploadProgress`：以函数式更新合并或删除各 uid 的进度，避免并行文件互相覆盖。
    const [uploadProgress, setUploadProgress] = useState({});
    // 开始/结束通知按 uid 去重，避免多次 progress 导致调用方重复计数。
    const activeUploadUidSetRef = useRef(new Set());
    // Antd/rc-upload 引用只用于取消已发起请求；升级依赖时需核对 abort 句柄并做运行态回归。
    const uploadRef = useRef(null);
    // mounted、revision 与 settled 同时约束存活实例、选择周期和单文件终态。
    const mounted = useRef(false);
    // `revision`：当前有效选择代次的同步 ref；清空和卸载递增，异步结果只能由同一代次消费。
    const revision = useRef(0);
    // 每份文件的成功/失败回调只消费一次；集合只保存 uid，不保存文件二进制或响应正文。
    const settled = useRef(new Set());
    // 异步 onRemove 的同步门闩，防止同一文件连点执行多次删除。
    const removing = useRef(new Set());
    useEffect(
      /**
       * 建立当前上传选择周期的存活身份并捕获进行中集合；返回卸载撤销入口，不能让旧校验回填下一周期列表。
       * @returns {Function}
       */ () => {
        mounted.current = true;
        revision.current = uploadCycle;
        // `activeUploads`：此 effect owner 捕获的进行中 uid 集合；卸载清空当前集合，不依赖后续 ref 值。
        const activeUploads = activeUploadUidSetRef.current;
        return (
          /**
           * 上传组件卸载时递增代次、禁用结果消费并清空捕获的 uid 集合；rc-upload 自身负责中止传输，避免重复访问已卸载实例。
           * @returns {void}
           */ () => {
            mounted.current = false;
            revision.current += 1;
            // rc-upload 自身在卸载时 abort；此时再调用已卸载实例会访问空的内部 ref。
            activeUploads.clear();
          }
        );
      },
      [uploadCycle]
    );

    /**
     * 标记某个文件进入上传中；同一 uid 重复 progress 事件不会重复触发开始回调。
     * @param {Record<string, any>} file 当前上传文件。
     * @returns {void}
     */
    const markUploadStarted = useCallback(
      (file) => {
        // `fileUid`：开始事件的文件身份；空值或已在集合中时不重复通知 onUploadStart。
        const fileUid = file?.uid;
        if (!fileUid || activeUploadUidSetRef.current.has(fileUid)) {
          return;
        }

        activeUploadUidSetRef.current.add(fileUid);
        onUploadStart && onUploadStart(file);
        setLoading(true);
      },
      [onUploadStart]
    );

    /**
     * 标记某个文件离开上传中；仅首个结束事件会生效，并在全部上传完成后关闭 loading。
     * @param {Record<string, any>} file 当前结束上传的文件。
     * @returns {void}
     */
    const markUploadEnded = useCallback(
      (file) => {
        // `fileUid`：结束事件的文件身份；只有已登记的 uid 才移出并配对通知 onUploadEnd。
        const fileUid = file?.uid;
        if (!fileUid || !activeUploadUidSetRef.current.has(fileUid)) {
          return;
        }

        activeUploadUidSetRef.current.delete(fileUid);
        onUploadEnd && onUploadEnd(file);
        setLoading(activeUploadUidSetRef.current.size > 0);
      },
      [onUploadEnd]
    );

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      /**
       * 同步撤销选择周期、取消现有传输并清理文件/进度，通知父级回填对应空值。
       * @returns {void} maxCount=1 回填空字符串，其余为空数组；旧校验和传输回调不得恢复已清空文件。
       * 清理仅作用于当前组件和浏览器传输，远端已保存资源仍需宿主自行管理。
       */
      clearFiles: () => {
        revision.current += 1;
        setUploadCycle(
          (/* `cycle`：React 提供的前一选择周期值；递增生成新 key，不使用闭包中的可能过期值。 */ cycle) => cycle + 1
        );
        fileList.forEach((/* `file`：清空时当前可见项；将 uid 标记为终态以拒绝已排队的迟到回调。 */ file) =>
          settled.current.add(file.uid)
        );
        uploadRef.current?.upload?.abort();
        fileList
          .filter(
            (/* `file`：清空前的可见项；只筛出 uploading 项以配对结束通知。 */ file) => file.status === 'uploading'
          )
          .forEach(markUploadEnded);
        activeUploadUidSetRef.current.clear();
        setLoading(false);
        setFileList([]);
        setUploadProgress({});
        onChange && onChange(maxCount === 1 ? '' : []);
      },
      /**
       * 取得当前可见的文件状态数组引用，用于父级只读观察上传状态。
       * @returns {Object[]} 内部数组的当前引用；调用方不得原地修改，需要独立快照时自行复制。
       */
      getFileList: () => fileList,
    }));

    // 获取完整的上传地址（自动拼接环境前缀）
    // 动作地址只拼接明确的 API 前缀；第三方目标允许传输但不会默认附带应用凭证。
    // `uploadActionUrl`：由固定 API 前缀与 uploadUrl 解析的实际传输地址；不等于允许自动附带凭证。
    const uploadActionUrl = useMemo(() => {
      // `baseUrl`：公开环境 API 前缀，默认 /api；仅用于地址拼接，不含业务路径或身份信息。
      const baseUrl = getApiBaseUrl('/api');
      return resolveUploadUrl({ baseUrl, uploadUrl });
    }, [uploadUrl]);

    // 获取请求头
    // `token`：本轮渲染读取的应用凭证；仅交给来源校验 helper，绝不写入资源 URL。
    const token = getToken();
    // 来源变化会重算头部；customHeaders 是调用方显式授权，第三方凭证应由该配置或 customRequest 管理。
    // `uploadHeaders`：自动同源 Bearer 与宿主显式头合并的请求头快照；来源或 token 改变后重新派生。
    const uploadHeaders = useMemo(
      () =>
        resolveUploadHeaders({
          token,
          customHeaders,
          apiBaseUrl: getApiBaseUrl('/api'),
          uploadUrl: uploadUrl ? uploadActionUrl : '',
        }),
      [token, customHeaders, uploadActionUrl, uploadUrl]
    );

    // 将value转换为fileList格式
    useEffect(() => {
      if (value === undefined) return;
      // `urls`：从受控 value 规整的安全资源地址集合；用于恢复已完成项并保留其它进行中项。
      const urls = normalizeValueToUrls(value);
      // 某个文件成功后的受控回填不能清掉其它仍在上传的文件。
      setFileList(
        (/* `previous`：React 在受控 value 回填时提供的最新列表；避免覆盖其它同时完成或上传中的文件。 */ previous) => [
          ...buildUploadFileList(urls).map(
            (/* `item`：由资源 URL 生成的已完成占位项；若旧列表已有同 URL 则复用旧项的 uid/状态。 */ item) =>
              previous.find(
                (/* `file`：旧列表中的候选项；按 URL 找到可复用项，避免受控回填重建文件身份。 */ file) =>
                  file.url === item.url
              ) || item
          ),
          ...previous.filter(
            (/* `file`：旧列表中的候选项；保留 status=uploading 的文件，防止别的文件成功回填将它清掉。 */ file) =>
              file.status === 'uploading'
          ),
        ]
      );
    }, [value]);

    // 获取文件类型的MIME配置
    // `acceptMimeTypes`：按 acceptTypes 优先、fileType 兜底得到的内容 MIME 校验表；null 表示不限类型。
    const acceptMimeTypes = useMemo(() => resolveAcceptMimeTypes({ fileType, acceptTypes }), [fileType, acceptTypes]);

    // 获取accept属性
    // `acceptAttr`：传给原生选择器的提示文本；它不能替代 beforeUpload 中的实际文件校验。
    const acceptAttr = useMemo(() => resolveAcceptAttr({ fileType, accept }), [fileType, accept]);

    /**
     * 选择后先运行宿主校验，再检查 MIME/大小，最后可选压缩；所有 await 后检查选择周期。
     * @param {File} file Antd 选中的带 uid 文件。
     * @returns {Promise<boolean|File|*>} true 使用原文件、File 使用压缩结果、LIST_IGNORE 拒绝。
     * 压缩失败回退原文件并提示；取消/清空后的旧结果不能重新进入传输队列。
     */
    const handleBeforeUpload = async (file) => {
      // 捕获选择周期，清空前已排队、尚未执行的 beforeUpload 也必须失效。
      // `version`：当前选择周期快照；跨 await 后与 revision 比对，清空或卸载后的结果失效。
      const version = uploadCycle;
      /**
       * 判断当前上传前处理是否仍属于存活 owner、同一选择周期且该 uid 尚未结束。
       * @returns {boolean} 只用于当前闭包，不产生异步状态或新请求。
       */
      const active = () => mounted.current && revision.current === version && !settled.current.has(file.uid);
      try {
        // 自定义的beforeUpload钩子
        if (customBeforeUpload) {
          // `result`：宿主 beforeUpload 的返回值；这里只消费 false/LIST_IGNORE，文件替换仍由本组件压缩流程决定。
          const result = await customBeforeUpload(file);
          if (!active() || result === false || result === Upload.LIST_IGNORE) {
            return Upload.LIST_IGNORE;
          }
        }

        if (!active()) return Upload.LIST_IGNORE;
        // `uploadTypeErrorMessage`：共享 MIME 校验的公开错误文本；非空即拒绝加入列表，避免无效文件开始传输。
        const uploadTypeErrorMessage = buildUploadTypeErrorMessage({
          file,
          fileType,
          acceptMimeTypes,
        });
        if (uploadTypeErrorMessage) {
          message.error(uploadTypeErrorMessage);
          return Upload.LIST_IGNORE;
        }

        // `uploadSizeErrorMessage`：共享 MiB 大小校验的公开错误文本；非空即反馈并返回 LIST_IGNORE。
        const uploadSizeErrorMessage = buildUploadSizeErrorMessage({
          file,
          maxSize,
        });
        if (uploadSizeErrorMessage) {
          message.error(uploadSizeErrorMessage);
          return Upload.LIST_IGNORE;
        }

        // 图片压缩
        if (imageCompression && file.type.startsWith('image/')) {
          try {
            // `compressedFile`：浏览器编码后的 File；保留 uid 并使用实际 MIME/后缀，只有当前周期才能继续上传。
            const compressedFile = await compressImage({
              file,
              maxWidth: imageCompressionMaxWidth,
              maxHeight: imageCompressionMaxHeight,
              quality: imageCompressionQuality,
            });
            return active() ? compressedFile : Upload.LIST_IGNORE;
          } catch (/* `error`：压缩失败原因；当前周期仍有效时降级原文件并提示，不把旧失败写回新周期。 */ error) {
            if (!active()) return Upload.LIST_IGNORE;
            logger.warn('图片压缩失败:', error);
            message.warning('图片压缩失败，将上传原图');
          }
        }

        return active() ? true : Upload.LIST_IGNORE;
      } catch (/* `error`：宿主上传前校验的失败原因；当前周期拒绝该文件，不启动传输。 */ error) {
        if (!active()) return Upload.LIST_IGNORE;
        logger.error('上传前校验失败:', error);
        return Upload.LIST_IGNORE;
      }
    };

    /**
     * 消费 Antd 的单文件状态事件并维护当前列表，终态按 uid 只处理一次。
     * @param {Object} event 包含 file/fileList；只在当前组件和选择周期有效时使用。
     * @returns {void} 先由 validateResponse 判业务结果，再提取安全 URL 并回填，失败不发布成功。
     */
    const handleChange = ({
      file,
      fileList:
        /* `newFileList`：Antd 当前事件携带的完整列表，来自 fileList 别名；本函数只派生新数组，不修改入参。 */ newFileList,
    }) => {
      if (!mounted.current || uploadCycle !== revision.current || settled.current.has(file.uid)) return;
      if (file.status === 'done' || file.status === 'error') settled.current.add(file.uid);
      setFileList(newFileList);

      // 上传中
      if (file.status === 'uploading') {
        markUploadStarted(file);
        if (showProgress && file.percent !== undefined) {
          setUploadProgress((/* `prev`：最新进度字典；保留其它 uid 的百分比，仅覆盖本次事件对应项。 */ prev) => ({
            ...prev,
            [file.uid]: file.percent,
          }));
          customProgress && customProgress(file.percent, file);
        }
      }

      // 上传成功
      if (file.status === 'done') {
        markUploadEnded(file);
        setUploadProgress((/* `prev`：完成事件提交时的最新进度字典；移除当前 uid 后保留其余并发任务。 */ prev) =>
          removeUploadProgressByUid(prev, file.uid)
        );

        // 处理响应数据
        // `response`：此文件的服务响应原值；先由宿主判业务成功，再按明确路径或解析器提取资源地址。
        const response = file.response;

        // `responseErrorMessage`：业务校验或响应解析的失败文案；有值时删除失败项且不回填成功 URL。
        let responseErrorMessage;
        // `fileUrl`：从响应提取且通过协议检查的资源地址；空地址会被当成上传失败。
        let fileUrl;
        try {
          responseErrorMessage = resolveUploadResponseErrorMessage(response, validateResponse);
          fileUrl = extractUrlFromUploadResponse({ response, dataPath, dataTransform });
        } catch (/* `error`：业务判定器或 URL 解析器抛出的异常；转换为当前文件失败文案，不发布成功。 */ error) {
          responseErrorMessage = getMsg(error, '上传响应解析失败');
        }
        if (responseErrorMessage) {
          message.error(responseErrorMessage);
          // `filteredList`：业务拒绝后剔除当前 uid 的列表快照；不影响其它并发文件。
          const filteredList = removeUploadFileByUid(newFileList, file.uid);
          setFileList(filteredList);
          customError && customError(response, file);
          return;
        }

        // 获取文件URL
        if (!fileUrl) {
          message.error('未获取到有效文件地址，上传结果未保存');
          customError?.(new Error('INVALID_UPLOAD_URL'), file);
          // `filteredList`：响应缺少有效 URL 时剔除当前 uid 的列表，不把无地址文件伪装为成功项。
          const filteredList = removeUploadFileByUid(newFileList, file.uid);
          setFileList(filteredList);
          return;
        }

        // `updatedList`：将当前完成文件的安全 URL 合并回新列表的快照，供视图和表单回填共用。
        const updatedList = buildUploadFileListWithResolvedUrl(newFileList, file.uid, fileUrl);
        setFileList(updatedList);

        // 触发onChange回调（用于表单）
        // `urls`：成功列表中已完成且有地址的 URL 集合；maxCount=1 时仅发布首项或空字符串。
        const urls = collectUploadedUrls(updatedList);
        onChange && onChange(maxCount === 1 ? urls[0] || '' : urls);

        // 触发自定义成功回调
        customSuccess && customSuccess(response, file);

        message.success(`${file.name} 上传成功！`);
      }

      // 上传失败
      if (file.status === 'error') {
        markUploadEnded(file);
        setUploadProgress((/* `prev`：失败事件提交时的最新进度字典；删除当前 uid 的显示进度。 */ prev) =>
          removeUploadProgressByUid(prev, file.uid)
        );

        message.error(`${file.name} 上传失败！`);

        // 移除失败的文件
        // `filteredList`：传输失败后剔除当前 uid 的列表，其它文件和进度继续保留。
        const filteredList = removeUploadFileByUid(newFileList, file.uid);
        setFileList(filteredList);

        // 触发自定义错误回调
        customError && customError(file.error, file);
      }
    };

    /**
     * 同步锁住同一 uid，等待宿主允许删除后中止传输、移除进度并回填剩余 URL。
     * @param {Object} file 当前列表条目，身份以 uid 为准。
     * @returns {Promise<boolean>} false 表示禁用、被拒绝、已失效或删除失败；输入与原文件保留。
     */
    const handleRemove = async (file) => {
      if (disabled || !showRemove || removing.current.has(file.uid)) return false;
      removing.current.add(file.uid);
      // `version`：删除开始时的选择周期；宿主许可返回后仍需核对存活状态和代次。
      const version = revision.current;
      try {
        if ((await customRemove?.(file)) === false) return false;
        if (!mounted.current || version !== revision.current) return false;
        settled.current.add(file.uid);
        uploadRef.current?.upload?.abort(file);
        markUploadEnded(file);
        // `next`：删除当前文件后的本地列表；不代表服务器上的资源已被删除。
        const next = removeUploadFileByUid(fileList, file.uid);
        setFileList(next);
        setUploadProgress((/* `previous`：删除许可返回后的最新进度字典；仅清掉被移除文件的 uid。 */ previous) =>
          removeUploadProgressByUid(previous, file.uid)
        );
        // `urls`：删除后的已完成资源 URL 集合，只用它更新表单值。
        const urls = collectUploadedUrls(next);
        onChange?.(maxCount === 1 ? urls[0] || '' : urls);
        return true;
      } catch (/* `error`：宿主删除许可的拒绝原因；仍在同一周期时提示并保留原项，finally 释放 uid 锁。 */ error) {
        if (mounted.current && version === revision.current) message.error(getMsg(error, '移除失败，请重试'));
        return false;
      } finally {
        removing.current.delete(file.uid);
      }
    };

    /**
     * 优先委托自定义回调，否则按安全资源地址打开图片/视频弹窗或外部资源窗口。
     * @param {Object} file 当前条目；没有有效地址时只反馈，不导航。
     * @returns {void} 默认外部窗口隔离 opener，不附加应用凭证。
     */
    const handlePreview = (file) => {
      // 自定义预览处理
      if (customPreview) {
        customPreview(file);
        return;
      }

      // `fileUrl`：预览 helper 返回的安全地址；无值时只提示，不创建弹窗或外部窗口。
      // `fileName`：预览标题的显示名称，来自文件名或 URL 尾段，不用作 DOM HTML。
      // `nextPreviewType`：预览资源分类；image/video 使用有界弹窗，other 使用隔离 opener 的窗口。
      const { fileUrl, fileName, previewType: nextPreviewType } = resolveUploadFileAsset({ file, fileType });
      if (!fileUrl) {
        message.warning('无法预览该文件');
        return;
      }

      if (nextPreviewType !== 'other') {
        setPreviewImage(fileUrl);
        setPreviewTitle(fileName);
        setPreviewType(nextPreviewType);
        setPreviewVisible(true);
        return;
      }

      // 其他文件，打开新窗口
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    /**
     * 优先调用宿主下载函数，否则用临时链接发起浏览器下载并立即移除节点。
     * @param {Object} file 当前条目，资源协议先经过共享 helper 限制。
     * @returns {void} 只表示下载入口已触发，不保证远端完成；跨来源 filename 由浏览器策略决定。
     */
    const handleDownload = (file) => {
      // 自定义下载处理
      if (customDownload) {
        customDownload(file);
        return;
      }

      // `fileUrl`：默认下载入口允许的资源地址；浏览器决定跨源下载的最终行为。
      // `fileName`：建议下载文件名，仅赋给 a.download；不能保证跨源服务器采纳。
      const { fileUrl, fileName } = resolveUploadFileAsset({ file, fileType });
      if (!fileUrl) {
        message.warning('无法下载该文件');
        return;
      }

      // 创建a标签下载
      // `link`：当前下载创建的临时 a 元素；点击后同步从 document.body 移除，不常驻页面。
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('开始下载...');
    };

    /**
     * 关闭预览并清理当前资源地址/标题引用，不删除上传文件或撤销远端资源。
     * @returns {void}
     */
    const handleCancelPreview = () => {
      setPreviewVisible(false);
      setPreviewImage('');
      setPreviewTitle('');
    };

    // 自定义item渲染（用于添加预览、下载和删除按钮）
    // `itemRender`：绑定当前状态和操作许可的列表渲染器；不创建另一份文件列表或传输任务。
    const itemRender = createUploadItemRender({
      listType,
      fileType,
      disabled,
      showPreview,
      showDownload,
      showRemove,
      showProgress,
      uploadProgress,
      onPreview: handlePreview,
      onDownload: handleDownload,
      onRemove: handleRemove,
    });

    // 把受控状态和所有生命周期回调一次交给 Upload，clearFiles 通过 key 重建传输 owner。
    // `uploadProps`：交给 Antd Upload 的当前受控配置；选择、移除、预览和下载统一使用本实例回调。
    const uploadProps = {
      name: fieldName,
      action: uploadActionUrl,
      headers: uploadHeaders,
      data: uploadData,
      listType,
      fileList,
      accept: acceptAttr,
      multiple: multiple && maxCount > 1,
      maxCount,
      disabled: disabled || (!uploadUrl && !customRequest),
      beforeUpload: handleBeforeUpload,
      onChange: handleChange,
      onRemove: handleRemove,
      onPreview: showPreview ? handlePreview : undefined,
      onDownload: showDownload ? handleDownload : undefined,
      itemRender,
      showUploadList: showFileList
        ? {
            showPreviewIcon: showPreview,
            showDownloadIcon: showDownload,
            showRemoveIcon: !disabled && showRemove,
          }
        : false,
      method,
      withCredentials,
      ...(customRequest && { customRequest }),
    };

    // `UploadComponent`：按 draggable 选择 Upload.Dragger 或 Upload；两种入口共享相同的限制与生命周期。
    const UploadComponent = draggable ? Upload.Dragger : Upload;

    return (
      <div className={`upload-file-wrapper ${className}`} style={style}>
        <UploadComponent
          {...uploadProps}
          key={uploadCycle}
          ref={uploadRef}
          className="upload-file-component"
          style={{
            '--upload-width': `${width}px`,
            '--upload-height': `${height}px`,
          }}
        >
          {fileList.length >= maxCount ? null : draggable ? (
            <div style={{ padding: '24px 16px' }}>
              <p className="ant-upload-drag-icon">
                <PlusOutlined style={{ fontSize: 48, color: antdToken.colorPrimary }} />
              </p>
              <p className="ant-upload-text">{placeholder || '点击或拖拽文件到此区域上传'}</p>
              {tips && <p className="ant-upload-hint">{tips}</p>}
            </div>
          ) : (
            children || <UploadButton loading={loading} placeholder={placeholder} />
          )}
        </UploadComponent>

        {/* 底部提示 */}
        {tips && !draggable && (
          <div className="upload-tips" style={{ marginTop: 8, color: antdToken.colorTextSecondary, fontSize: 12 }}>
            {tips}
          </div>
        )}

        <PreviewModal
          open={previewVisible}
          title={previewTitle}
          type={previewType}
          src={previewImage}
          onCancel={handleCancelPreview}
        />
      </div>
    );
  }
);

UploadFile.displayName = 'UploadFile';

export default UploadFile;

// ───── 模块结束：src/components/UploadFile/index.jsx ─────
