/**
 * 模块职责：为上传组件规整文件值、传输来源、资源地址、响应字段和列表终态，纯规则与 UI 共用。
 * 应用 Bearer 只用于明确的同 API 来源；资源预览/下载拒绝脚本、本地文件和 HTML Data URL。
 * 业务成功由 validateResponse 明确声明，类型和大小的客户端限制不能替代服务端文件检查。
 */
// 复用类型收窄与文件名 URI 解码；无法解码时保持安全占位，不读取网络或磁盘。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 * `ensureNumber`：按有限数或数字文本规则提取显示值，不调用对象的 valueOf。
 * `ensureString`：把可确定的标量转成展示文本，避免对象意外渲染为 [object Object]。
 * `safeDecodeURIComponent`：为路径片段或展示名称解码百分号编码，失败时保留指定展示回退。
 */
import { ensureArray, ensureNumber, ensureString, safeDecodeURIComponent } from '@/utils/robust';
// 这些 MIME 仅用于前端选择/校验，浏览器上报值可以伪造，服务端仍须检查实际内容。
// `DEFAULT_MIME_TYPES`：各通用分类的默认浏览器 MIME 表；file/all 显式为 null 表示不限，未知类型沿 image 兜底。
const DEFAULT_MIME_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
  video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'],
  audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
  file: null,
  all: null,
};

// 选择器 accept 是用户提示，不承担安全校验；实际校验仍用 MIME 表和服务端规则。
// `DEFAULT_ACCEPT`：原生选择器的分类提示表；只改善选择体验，不代替 MIME 和服务端内容校验。
const DEFAULT_ACCEPT = {
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv',
  file: '*',
  all: '*',
};

// 分类名称只服务于校验提示，不能据此推断真实媒体内容。
// `FILE_TYPE_LABELS`：校验失败文案使用的中文分类名；没有内建标签时展示宿主 MIME 列表。
const FILE_TYPE_LABELS = {
  image: '图片',
  video: '视频',
  audio: '音频',
  document: '文档',
};

// 扩展名只选择预览 UI；浏览器实际解码失败仍由预览组件反馈。
// `IMAGE_PREVIEW_EXTENSIONS`：按扩展名选择图片预览的集合，不能证明文件实际内容或浏览器可解码。
const IMAGE_PREVIEW_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']);
// `VIDEO_PREVIEW_EXTENSIONS`：按扩展名选择视频预览的集合，实际编解码支持由当前浏览器决定。
const VIDEO_PREVIEW_EXTENSIONS = new Set(['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']);

/**
 * 从资源 URL 文本计算稳定的非加密标识片段，只用于列表 uid。
 * @param {*} value URL 候选，先收窄为字符串。
 * @returns {string} base36 标识，不用于文件真实性、权限或去重存储。
 */
function hashString(value) {
  // `str`：URL 候选收窄后的文本，仅用于稳定 UI 哈希；非字符串回退空串。
  const str = ensureString(value);
  // `hash`：从 5381 开始的 32 位滚动哈希累加值，只生成列表标识，不具备密码学安全性。
  let hash = 5381;
  // `i`：当前 UTF-16 码元的零起始下标；按字符串顺序参与哈希，不改变原文本。
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * 把 URL 与列表索引组合成稳定 UI 身份，刷新受控值时尽量复用相同条目。
 * @param {*} url 已归一化资源地址。
 * @param {number} [index=0] 相同 URL 重复出现时的列表位置。
 * @returns {string} 只用于 Antd 列表 uid，不代表服务器文件 ID。
 */
export function createStableFileUid(url, index = 0) {
  // `normalizedUrl`：用于 uid 的 URL 文本；调用方应先完成协议校验，本函数不探测资源。
  const normalizedUrl = ensureString(url);
  // `idx`：可转为有限数值的条目位置，否则为 0；用于区分同 URL 的重复项。
  const idx = Number.isFinite(Number(index)) ? Number(index) : 0;
  return `upload_${hashString(normalizedUrl)}_${idx}`;
}

/**
 * 把受控字符串/数组转成安全资源 URL 列表，忽略空值和不允许的协议。
 * @param {string|string[]|undefined} value 单个或多个资源值。
 * @returns {string[]} 新数组，不修改输入；未知对象不会强制转成资源路径。
 */
export function normalizeValueToUrls(value) {
  if (!value) return [];
  if (typeof value === 'string') {
    // `url`：单值受控输入经安全资源检查后的地址；拒绝协议时为空，不生成列表项。
    const url = resolveSafeAssetUrl(value);
    return url ? [url] : [];
  }
  if (Array.isArray(value)) {
    return ensureArray(value)
      .map((/* `v`：多值受控数组的当前资源候选，逐项通过 resolveSafeAssetUrl，不强制转换对象。 */ v) =>
        resolveSafeAssetUrl(v)
      )
      .filter((/* `v`：已经规整的安全地址或空串，过滤空值后生成有效受控列表。 */ v) => v);
  }
  return [];
}

/**
 * 限制默认预览/下载可以消费的资源协议，不对资源内容或目标可信度作背书。
 * @param {*} value 接口或受控表单提供的 URL 候选。
 * @returns {string} 接受 HTTP(S)、相对资源、Blob 和少量位图 Base64；其余返回空串。
 * 拒绝携带用户名/密码的地址；Blob 可达性、跨来源下载和图片内容验证仍由浏览器/服务端处理。
 */
export function resolveSafeAssetUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  // `candidate`：剔除首尾空白后的资源候选；保留原地址语义供浏览器使用，不拼接凭证。
  const candidate = value.trim();
  if (/^data:image\/(png|jpeg|gif|webp);base64,[a-z\d+/]+=*$/i.test(candidate)) return candidate;
  try {
    // `parsed`：基于当前文档或测试 localhost 解析的 URL；只检查协议和内嵌用户名/密码。
    const parsed = new URL(candidate, globalThis.location?.href || 'http://localhost/');
    return ['http:', 'https:', 'blob:'].includes(parsed.protocol) && !parsed.username && !parsed.password
      ? candidate
      : '';
  } catch {
    return '';
  }
}

/**
 * 从资源路径末段生成显示文件名，去掉查询串并尝试 URI 解码。
 * @param {*} url 资源地址，只用于标签展示。
 * @returns {string} 空路径或解码无有效结果时返回未命名文件，不把它作为磁盘路径。
 */
export function getFileNameFromUrl(url) {
  // `raw`：用于文件名展示的原 URL 文本；非文本或空串使用未命名文件。
  const raw = ensureString(url);
  if (!raw) return '未命名文件';
  // `urlPath`：剔除问号查询后的路径文本；不请求服务，也不作为本地文件路径。
  const urlPath = raw.split('?')[0];
  // `fileName`：路径最后一段的编码文件名，随后只做 URI 解码与显示兜底。
  const fileName = urlPath.substring(urlPath.lastIndexOf('/') + 1);
  // `decoded`：安全 URI 解码后的显示名，失败为空串并由调用处回退未命名文件。
  const decoded = safeDecodeURIComponent(fileName, '');
  return decoded || '未命名文件';
}

/**
 * 把外部 value 归一化后的 URL 列表转换成 antd Upload 需要的 fileList。
 * @param {string[]} urls 已通过 normalizeValueToUrls 校验的地址；本函数只构造视图条目。
 * @returns {Object[]} 每项含稳定 uid、显示名称、done 状态及 url/thumbUrl；不探测资源可达性。
 */
export function buildUploadFileList(urls) {
  return ensureArray(urls).map(
    (
      /* `url`：已规整 URL 数组中的当前地址，用于生成展示名、稳定 uid 与缩略图来源。 */ url,
      /* `index`：当前地址的零起始位置；参与 uid 以区分同地址重复项。 */ index
    ) => ({
      uid: createStableFileUid(url, index),
      name: getFileNameFromUrl(url),
      status: 'done',
      url,
      thumbUrl: url,
    })
  );
}

/**
 * 收集已上传成功文件的 URL 列表，统一单文件/多文件回传口径。
 * @param {Object[]} fileList 当前 Antd 文件快照，上传中或失败项不参与回填。
 * @returns {string[]} 新数组；done 项也会重新通过资源协议校验。
 */
export function collectUploadedUrls(fileList) {
  return ensureArray(fileList)
    .filter((/* `item`：当前上传列表条目，只有 status=done 才可进入表单回填。 */ item) => item.status === 'done')
    .map((/* `item`：已完成候选条目；其 url 仍要重新检查协议，防止原始响应直接成为导航目标。 */ item) =>
      resolveSafeAssetUrl(item.url)
    )
    .filter(Boolean);
}

/**
 * 根据 fileType 与 MIME 配置生成用于错误提示的人类可读类型文案。
 * @param {string} fileType 图片、视频、音频或文档分类。
 * @param {string[]|null} acceptMimeTypes 自定义 MIME 表，未知分类直接展示该表。
 * @returns {string} 纯文本提示，不影响文件验证规则。
 */
export function getAcceptTypeLabel(fileType, acceptMimeTypes) {
  return Object.hasOwn(FILE_TYPE_LABELS, fileType)
    ? FILE_TYPE_LABELS[fileType]
    : ensureArray(acceptMimeTypes).join(', ');
}

/**
 * 生成文件类型校验失败提示文案。
 * @param {Object} options file.type 为浏览器上报 MIME，fileType 决定提示名称，acceptMimeTypes=null 不限制。
 * @returns {string} 空串表示客户端类型检查通过，否则返回错误文案；不检查文件字节内容。
 */
export function buildUploadTypeErrorMessage({ file, fileType, acceptMimeTypes }) {
  if (!acceptMimeTypes) {
    return '';
  }

  // `isValidType`：浏览器上报 file.type 是否属于明确 MIME 白名单；不能验证文件真实字节内容。
  const isValidType = ensureArray(acceptMimeTypes).includes(file?.type);
  if (isValidType) {
    return '';
  }

  return `只能上传 ${getAcceptTypeLabel(fileType, acceptMimeTypes)} 格式的文件！`;
}

/**
 * 生成文件大小校验失败提示文案。
 * @param {Object} options file.size 为字节数，maxSize 为 MiB 上限；恰好等于上限也拒绝。
 * @returns {string} 空串表示通过，否则包含两位小数的文件大小提示。
 */
export function buildUploadSizeErrorMessage({ file, maxSize }) {
  // `fileSizeMB`：从字节数换算的 MiB 大小，按 1024² 除法计算；文案沿用 MB 标签。
  const fileSizeMB = ensureNumber(file?.size, 0) / 1024 / 1024;
  // `isValidSize`：当前 MiB 大小是否严格小于 maxSize，恰好等于上限也拒绝。
  const isValidSize = fileSizeMB < maxSize;
  if (isValidSize) {
    return '';
  }

  return `文件大小不能超过 ${maxSize}MB！当前文件大小: ${ensureNumber(fileSizeMB).toFixed(2)}MB`;
}

/**
 * 根据组件配置与文件名推断预览类型。
 * @param {Object} options fileType 是宿主分类，fileName 只读取扩展名；不会请求文件。
 * @returns {'image'|'video'|'other'} 预览分支；不是资源真实 MIME 的检测结论。
 */
export function resolvePreviewType({ fileType, fileName }) {
  // `normalizedFileType`：宿主文件分类的字符串形式，image/video 可直接指定预览分支。
  const normalizedFileType = ensureString(fileType);
  // `normalizedName`：用于扩展名推断的显示文件名，不作为 MIME 或权限判断依据。
  const normalizedName = ensureString(fileName);
  // `extension`：最后一个点开始的小写后缀；只用于图片/视频预览选择。
  const extension = normalizedName.substring(normalizedName.lastIndexOf('.')).toLowerCase();

  if (normalizedFileType === 'image' || IMAGE_PREVIEW_EXTENSIONS.has(extension)) {
    return 'image';
  }

  if (normalizedFileType === 'video' || VIDEO_PREVIEW_EXTENSIONS.has(extension)) {
    return 'video';
  }

  return 'other';
}

/**
 * 从上传组件 file 对象里提取可复用的预览/下载目标数据。
 * @param {Object} options file 的 url 优先于 preview，name 优先于路径推断；fileType 指定预览分类。
 * @returns {{fileUrl:string,fileName:string,previewType:string}} 地址无效时 fileUrl 为空，调用方应停止导航。
 */
export function resolveUploadFileAsset({ file, fileType }) {
  // `fileUrl`：file.url 优先、file.preview 兜底的安全资源地址；无有效来源时为空串。
  const fileUrl = resolveSafeAssetUrl(file?.url || file?.preview);
  // `fileName`：优先使用 file.name 的显示名称，缺失时由安全地址推断，不转为 HTML。
  const fileName = ensureString(file?.name) || getFileNameFromUrl(fileUrl);

  return {
    fileUrl,
    fileName,
    previewType: resolvePreviewType({ fileType, fileName }),
  };
}

/**
 * 组合 API 基址与上传路径，明确的 HTTP(S) 目标保持原值。
 * @param {Object} options baseUrl 为公开环境基址，uploadUrl 由宿主声明。
 * @returns {string} 传给 Upload 的动作地址；此拼接不意味着应给跨来源目标附带凭证。
 */
export function resolveUploadUrl({ baseUrl, uploadUrl }) {
  // `base`：上传 API 基址文本，稍后去掉末尾单斜杠以避免常见重复分隔符。
  const base = ensureString(baseUrl);
  // `url`：宿主声明的上传路径或 HTTP(S) 地址；明确外部地址不额外拼接 API 前缀。
  const url = ensureString(uploadUrl, '');

  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  // `normalizedBase`：去掉一个结尾斜杠的 API 前缀，保留其余部署路径。
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  // `normalizedPath`：确保以单个显式前导斜杠开始的上传路径；不是来源授权判断。
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;

  return `${normalizedBase}${normalizedPath}`;
}

/**
 * 仅在明确上传目标与 API 基址同 origin 时自动附加应用 Bearer。
 * @param {Object} options token 为当前应用凭证；apiBaseUrl 默认 /api。
 * @param {string} [options.uploadUrl] 省略时沿用 apiBaseUrl，显式空串表示目标由 customRequest 决定。
 * @param {Object} [options.customHeaders] 调用方显式授权的请求头优先，可为第三方存储提供自己的短期凭证。
 * @returns {Object} 新头部对象；无法解析来源时不发送自动应用凭证。
 */
export function resolveUploadHeaders({ token, customHeaders, apiBaseUrl = '/api', uploadUrl = apiBaseUrl }) {
  // `normalizedToken`：当前凭证的字符串值；只有目标同 API 来源且地址明确时用于自动 Bearer。
  const normalizedToken = ensureString(token);
  // `sameOrigin`：是否已确认上传目标为 HTTP(S) 且 origin 与 API 完全一致，初始 false。
  let sameOrigin = false;
  try {
    // `documentUrl`：解析相对 API/上传地址的当前页面基准；无浏览器位置时使用测试 localhost。
    const documentUrl = globalThis.location?.href || 'http://localhost/';
    // `api`：可信 API 配置相对文档解析后的 URL，只取 origin 参与自动凭证判断。
    const api = new URL(apiBaseUrl, documentUrl);
    // `target`：明确上传地址相对文档解析后的 URL；空 customRequest 目标不授予自动凭证。
    const target = new URL(uploadUrl, documentUrl);
    sameOrigin = Boolean(uploadUrl) && ['http:', 'https:'].includes(target.protocol) && target.origin === api.origin;
  } catch {
    // 不能确认目标来源时不发送应用凭证；传输层负责展示地址配置错误。
  }
  // `base`：满足同来源条件后生成的自动 Authorization 头，否则空对象；不直接修改宿主头。
  const base = normalizedToken && sameOrigin ? { Authorization: `Bearer ${normalizedToken}` } : {};
  // `extra`：宿主显式传入的头对象；非对象按空对象处理，最终覆盖同名自动头。
  const extra = customHeaders && typeof customHeaders === 'object' ? customHeaders : {};
  return { ...base, ...extra };
}

/**
 * 优先使用显式 MIME 表，否则读取分类预设；file/all 分类不限制 MIME。
 * @param {Object} options fileType 为中性类型分类，acceptTypes 为可选非空数组。
 * @returns {string[]|null} 只用于客户端校验，未知分类沿图片预设。
 */
export function resolveAcceptMimeTypes({ fileType, acceptTypes }) {
  if (acceptTypes && Array.isArray(acceptTypes) && acceptTypes.length > 0) {
    return acceptTypes;
  }
  // `type`：用于 MIME 表 own-property 查询的分类，缺失时 image；避免原型属性被当作分类。
  const type = ensureString(fileType, 'image');
  return Object.hasOwn(DEFAULT_MIME_TYPES, type) ? DEFAULT_MIME_TYPES[type] : DEFAULT_MIME_TYPES.image;
}

/**
 * 为文件选择器产生 accept 文本，显式非空 accept 优先。
 * @param {Object} options fileType 决定默认提示，accept 由调用方覆盖。
 * @returns {string} 选择器提示，不代表服务器已接受该类型。
 */
export function resolveAcceptAttr({ fileType, accept }) {
  // `explicit`：宿主显式的 accept 文本；非空时优先于默认分类提示。
  const explicit = ensureString(accept);
  if (explicit) return explicit;
  // `type`：用于原生 accept 默认提示的分类，缺失时 image。
  const type = ensureString(fileType, 'image');
  return Object.hasOwn(DEFAULT_ACCEPT, type) ? DEFAULT_ACCEPT[type] : DEFAULT_ACCEPT.image;
}

/**
 * 从上传响应中提取文件 URL，兼容 path 字符串、path 函数和常见后端响应兜底字段。
 * @param {Object} options response 是原始响应；同步 dataTransform 优先，其次 dataPath 函数或点分字段路径。
 * @returns {string} 协议校验后的非空资源地址或空串；转换函数抛错时原样向上抛出。
 * 本函数只读取 URL，不判断业务成功；validateResponse 应在本函数之前执行。
 */
export function extractUrlFromUploadResponse({ response, dataPath = 'data.link', dataTransform }) {
  if (dataTransform) {
    // `value`：dataTransform 同步返回的资源候选，仍必须通过统一协议校验。
    const value = dataTransform(response);
    return resolveSafeAssetUrl(value);
  }

  if (typeof dataPath === 'function') {
    // `value`：函数式 dataPath 同步返回的资源候选，不因来自自定义解析器而跳过校验。
    const value = dataPath(response);
    return resolveSafeAssetUrl(value);
  }

  // `paths`：点分 dataPath 的路径片段数组，默认 data.link；不执行表达式。
  const paths = ensureString(dataPath, 'data.link').split('.');
  // `result`：沿显式字段路径读取的当前节点，起点为 response；最终只能消费字符串 URL。
  let result = response;
  // `path`：当前路径片段，仅在中间节点为对象时读取；不修改响应对象。
  for (const path of paths) {
    if (result && typeof result === 'object') {
      result = result[path];
    } else {
      break;
    }
  }

  return resolveSafeAssetUrl(
    [result, response?.data?.url, response?.data?.link, response?.data, response?.url]
      .find(
        (/* `value`：显式路径和常见兜底字段中的当前候选；选择首个非空字符串，再统一检查协议。 */ value) =>
          typeof value === 'string' && value.trim()
      )
      ?.trim() || ''
  );
}

/**
 * 解析上传响应里的错误文案；返回空字符串代表可以继续走成功链路。
 * @param {*} response 原始上传响应，未预置任何业务信封。
 * @param {Function|undefined} validateResponse 同步验证；false 拒绝、非空字符串作错误文案。
 * @returns {string} 错误文案或空串；验证函数抛错交由组件统一显示，异步验证不受支持。
 */
export function resolveUploadResponseErrorMessage(response, validateResponse) {
  // 上传层不解释业务 code；业务拒绝必须由接入方显式适配。
  if (!validateResponse) return '';
  // `result`：宿主同步 validateResponse 的返回值；false 变默认错误文本，字符串保留为文案。
  const result = validateResponse(response);
  return result === false ? '上传未成功，请重试' : typeof result === 'string' ? result : '';
}

/**
 * 从 fileList 中移除指定 uid 的文件。
 * @param {Object[]} fileList 当前文件数组，非数组按空列表处理。
 * @param {string} uid 只比较规整后的 UI 身份，不发起服务器删除。
 * @returns {Object[]} 新数组，保留其余条目对象引用。
 */
export function removeUploadFileByUid(fileList, uid) {
  // `targetUid`：待删除 UI 身份的字符串值；只影响内存列表，不触发服务器删除。
  const targetUid = ensureString(uid);
  return ensureArray(fileList).filter(
    (/* `item`：删除遍历的当前条目；uid 与目标不同才保留，不改其余对象内容。 */ item) =>
      ensureString(item?.uid) !== targetUid
  );
}

/**
 * 只更新目标文件的 url / thumbUrl，保持其他文件条目不变。
 * @param {Object[]} fileList 当前列表，非数组按空列表处理。
 * @param {string} targetUid 已确认仍有效的文件身份。
 * @param {string} fileUrl 已通过响应解析和协议校验的资源 URL。
 * @returns {Object[]} 新数组，仅目标条目被复制；不改变 status 或其它文件的上传进度。
 */
export function buildUploadFileListWithResolvedUrl(fileList, targetUid, fileUrl) {
  // `stableTargetUid`：本次完成事件的 uid 文本；只复制匹配项，其余条目保持引用。
  const stableTargetUid = ensureString(targetUid);
  // `stableFileUrl`：已由上游校验的资源地址文本，写入目标项 url/thumbUrl，不改变其传输状态。
  const stableFileUrl = ensureString(fileUrl);

  return ensureArray(fileList).map(
    (/* `item`：成功 URL 回填时的当前条目；只复制 uid 匹配项，其它项沿用原引用。 */ item) => {
      if (ensureString(item?.uid) !== stableTargetUid) {
        return item;
      }

      return {
        ...item,
        url: stableFileUrl,
        thumbUrl: stableFileUrl,
      };
    }
  );
}

/**
 * 删除某个文件对应的上传进度记录。
 * @param {Object} uploadProgress uid 到百分比的当前映射。
 * @param {string} uid 本次结束、移除或取消的文件身份。
 * @returns {Object} 新映射，不修改输入；未知 uid 不影响其它记录。
 */
export function removeUploadProgressByUid(uploadProgress, uid) {
  // `nextProgress`：进度映射的浅副本；删除当前 uid 后返回，保留其它文件进度。
  const nextProgress = { ...(uploadProgress && typeof uploadProgress === 'object' ? uploadProgress : {}) };
  delete nextProgress[uid];
  return nextProgress;
}

// ───── 模块结束：src/components/UploadFile/utils.js ─────
