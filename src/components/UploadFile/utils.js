/**
 * @file src/components/UploadFile/utils.js
 * @description UploadFile 工具函数：处理 URL/accept/headers/value 归一化、预览类型判断和上传结果收敛等纯逻辑，便于主组件保持轻量并覆盖单测。
 */
import { ensureArray, ensureNumber, ensureString, safeDecodeURIComponent } from '@/utils/robust';
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

const DEFAULT_ACCEPT = {
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv',
  file: '*',
  all: '*',
};

const FILE_TYPE_LABELS = {
  image: '图片',
  video: '视频',
  audio: '音频',
  document: '文档',
};

const IMAGE_PREVIEW_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']);
const VIDEO_PREVIEW_EXTENSIONS = new Set(['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']);

function hashString(value) {
  const str = ensureString(value);
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function createStableFileUid(url, index = 0) {
  const normalizedUrl = ensureString(url);
  const idx = Number.isFinite(Number(index)) ? Number(index) : 0;
  return `upload_${hashString(normalizedUrl)}_${idx}`;
}

export function normalizeValueToUrls(value) {
  if (!value) return [];
  if (typeof value === 'string') return value ? [value] : [];
  if (Array.isArray(value)) {
    return ensureArray(value)
      .map((v) => ensureString(v))
      .filter((v) => v);
  }
  return [];
}

export function getFileNameFromUrl(url) {
  const raw = ensureString(url);
  if (!raw) return '未命名文件';
  const urlPath = raw.split('?')[0];
  const fileName = urlPath.substring(urlPath.lastIndexOf('/') + 1);
  const decoded = safeDecodeURIComponent(fileName, '');
  return decoded || '未命名文件';
}

/**
 * 把外部 value 归一化后的 URL 列表转换成 antd Upload 需要的 fileList。
 */
export function buildUploadFileList(urls) {
  return ensureArray(urls).map((url, index) => ({
    uid: createStableFileUid(url, index),
    name: getFileNameFromUrl(url),
    status: 'done',
    url,
    thumbUrl: url,
  }));
}

/**
 * 收集已上传成功文件的 URL 列表，统一单文件/多文件回传口径。
 */
export function collectUploadedUrls(fileList) {
  return ensureArray(fileList)
    .filter((item) => item.status === 'done')
    .map((item) => ensureString(item.url))
    .filter(Boolean);
}

/**
 * 根据 fileType 与 MIME 配置生成用于错误提示的人类可读类型文案。
 */
export function getAcceptTypeLabel(fileType, acceptMimeTypes) {
  return FILE_TYPE_LABELS[fileType] ?? ensureArray(acceptMimeTypes).join(', ');
}

/**
 * 生成文件类型校验失败提示文案。
 */
export function buildUploadTypeErrorMessage({ file, fileType, acceptMimeTypes }) {
  if (!acceptMimeTypes) {
    return '';
  }

  const isValidType = ensureArray(acceptMimeTypes).includes(file?.type);
  if (isValidType) {
    return '';
  }

  return `只能上传 ${getAcceptTypeLabel(fileType, acceptMimeTypes)} 格式的文件！`;
}

/**
 * 生成文件大小校验失败提示文案。
 */
export function buildUploadSizeErrorMessage({ file, maxSize }) {
  const fileSizeMB = ensureNumber(file?.size, 0) / 1024 / 1024;
  const isValidSize = fileSizeMB < maxSize;
  if (isValidSize) {
    return '';
  }

  return `文件大小不能超过 ${maxSize}MB！当前文件大小: ${ensureNumber(fileSizeMB).toFixed(2)}MB`;
}

/**
 * 根据组件配置与文件名推断预览类型。
 */
export function resolvePreviewType({ fileType, fileName }) {
  const normalizedFileType = ensureString(fileType);
  const normalizedName = ensureString(fileName);
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
 */
export function resolveUploadFileAsset({ file, fileType }) {
  const fileUrl = ensureString(file?.url || file?.preview);
  const fileName = ensureString(file?.name) || getFileNameFromUrl(fileUrl);

  return {
    fileUrl,
    fileName,
    previewType: resolvePreviewType({ fileType, fileName }),
  };
}

export function resolveUploadUrl({ baseUrl, uploadUrl }) {
  const base = ensureString(baseUrl);
  const url = ensureString(uploadUrl, '');

  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;

  return `${normalizedBase}${normalizedPath}`;
}

export function resolveUploadHeaders({ token, customHeaders }) {
  const normalizedToken = ensureString(token);
  const base = normalizedToken ? { Authorization: `Bearer ${normalizedToken}` } : {};
  const extra = customHeaders && typeof customHeaders === 'object' ? customHeaders : {};
  return { ...base, ...extra };
}

export function resolveAcceptMimeTypes({ fileType, acceptTypes }) {
  if (acceptTypes && Array.isArray(acceptTypes) && acceptTypes.length > 0) {
    return acceptTypes;
  }
  const type = ensureString(fileType, 'image');
  return DEFAULT_MIME_TYPES[type] ?? DEFAULT_MIME_TYPES.image;
}

export function resolveAcceptAttr({ fileType, accept }) {
  const explicit = ensureString(accept);
  if (explicit) return explicit;
  const type = ensureString(fileType, 'image');
  return DEFAULT_ACCEPT[type] ?? DEFAULT_ACCEPT.image;
}

/**
 * 从上传响应中提取文件 URL，兼容 path 字符串、path 函数和常见后端响应兜底字段。
 */
export function extractUrlFromUploadResponse({ response, dataPath = 'data.link', dataTransform }) {
  if (dataTransform) {
    const value = dataTransform(response);
    return typeof value === 'string' ? value.trim() : '';
  }

  if (typeof dataPath === 'function') {
    const value = dataPath(response);
    return typeof value === 'string' ? value.trim() : '';
  }

  const paths = ensureString(dataPath, 'data.link').split('.');
  let result = response;
  for (const path of paths) {
    if (result && typeof result === 'object') {
      result = result[path];
    } else {
      break;
    }
  }

  return (
    [result, response?.data?.url, response?.data?.link, response?.data, response?.url]
      .find((value) => typeof value === 'string' && value.trim())
      ?.trim() || ''
  );
}

/**
 * 解析上传响应里的错误文案；返回空字符串代表可以继续走成功链路。
 */
export function resolveUploadResponseErrorMessage(response, validateResponse) {
  // 上传层不解释业务 code；业务拒绝必须由接入方显式适配。
  if (!validateResponse) return '';
  const result = validateResponse(response);
  return result === false ? '上传未成功，请重试' : typeof result === 'string' ? result : '';
}

/**
 * 从 fileList 中移除指定 uid 的文件。
 */
export function removeUploadFileByUid(fileList, uid) {
  const targetUid = ensureString(uid);
  return ensureArray(fileList).filter((item) => ensureString(item?.uid) !== targetUid);
}

/**
 * 只更新目标文件的 url / thumbUrl，保持其他文件条目不变。
 */
export function buildUploadFileListWithResolvedUrl(fileList, targetUid, fileUrl) {
  const stableTargetUid = ensureString(targetUid);
  const stableFileUrl = ensureString(fileUrl);

  return ensureArray(fileList).map((item) => {
    if (ensureString(item?.uid) !== stableTargetUid) {
      return item;
    }

    return {
      ...item,
      url: stableFileUrl,
      thumbUrl: stableFileUrl,
    };
  });
}

/**
 * 删除某个文件对应的上传进度记录。
 */
export function removeUploadProgressByUid(uploadProgress, uid) {
  const nextProgress = { ...(uploadProgress && typeof uploadProgress === 'object' ? uploadProgress : {}) };
  delete nextProgress[uid];
  return nextProgress;
}
