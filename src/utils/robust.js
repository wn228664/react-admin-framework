/**
 * @file src/utils/robust.js
 * @description 运行时稳健性工具箱，提供类型安全转换、JSON 安全解析、API 响应解包等功能，有效防止空值和类型错误导致的页面崩溃。
 */
// ============ 类型兜底（避免 map/toFixed 直接崩）===========

/**
 * 确保返回数组
 * @param {*} value - 任意值
 * @param {Array} fallback - 回退数组
 * @returns {Array} 数组
 */
export function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

/**
 * 确保返回普通对象（非数组/非 null）
 * @param {*} value - 任意值
 * @param {Object} fallback - 回退对象
 * @returns {Object} 普通对象
 */
export function ensureObject(value, fallback = {}) {
  if (!value || typeof value !== 'object') return fallback;
  if (Array.isArray(value)) return fallback;
  if (Object.prototype.toString.call(value) !== '[object Object]') return fallback;
  return value;
}

/**
 * 确保返回字符串
 * @param {*} value - 任意值
 * @param {string} fallback - 回退字符串
 * @returns {string} 字符串
 */
export function ensureString(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return fallback;
}

/**
 * 确保返回有限数字
 * @param {*} value - 任意值（支持 number / string）
 * @param {number} fallback - 回退数字
 * @returns {number} 有限数字
 */
export function ensureNumber(value, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'bigint') {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  if (value == null || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    // 兼容 "1,234.50" 这类带千分位分隔符的字符串
    const normalized = value.replace(/,/g, '').trim();
    if (normalized === '') return fallback;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

// ============ 安全解析（替换散落 try/catch）===========

/**
 * 安全 JSON.parse
 * @param {*} input - 待解析内容（通常为 string）
 * @param {*} fallback - 解析失败回退
 * @returns {*} 解析结果或回退
 */
export function safeJsonParse(input, fallback = null) {
  if (input == null) return fallback;
  if (typeof input !== 'string') return typeof input === 'object' ? input : fallback;
  try {
    return JSON.parse(input);
  } catch (error) {
    return fallback;
  }
}

/**
 * 获取 API_BASE_URL（通常由构建工具 define 注入），并提供回退值
 * @param {string} fallback - baseURL 回退值
 * @returns {string} baseURL
 */
export function getApiBaseUrl(fallback = '/api') {
  // eslint-disable-next-line no-undef
  return (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) || fallback;
}

/**
 * 安全执行原生对象枚举方法。
 * @param {*} value - 待枚举的目标值。
 * @param {(target: object) => Array} extractor - 原生对象枚举方法。
 * @returns {Array} 成功时返回原生结果，失败时统一回退为空数组。
 */
function runSafeObjectExtractor(value, extractor) {
  if (value == null) return [];
  try {
    return extractor(value);
  } catch (error) {
    return [];
  }
}

/**
 * 安全 Object.keys（避免 null/undefined 抛错）
 * @param {*} value - 待取 key 的对象
 * @returns {string[]} keys 数组
 */
export function safeObjectKeys(value) {
  return runSafeObjectExtractor(value, Object.keys);
}

/**
 * 安全 Object.values（避免 null/undefined 抛错）
 * @param {*} value - 待取 value 的对象
 * @returns {Array} values 数组
 */
export function safeObjectValues(value) {
  return runSafeObjectExtractor(value, Object.values);
}

/**
 * 安全 Object.entries（避免 null/undefined 抛错）
 * @param {*} value - 待取 entries 的对象
 * @returns {Array} entries 数组
 */
export function safeObjectEntries(value) {
  return runSafeObjectExtractor(value, Object.entries);
}

/**
 * 安全 decodeURIComponent
 * @param {*} value - 待解码内容
 * @param {string} fallback - 解码失败回退
 * @returns {string} 解码后的字符串
 */
export function safeDecodeURIComponent(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return fallback;
  }
}

/**
 * 安全 Base64 解码（浏览器优先用 atob；Node 环境回退 Buffer）
 * @param {*} value - Base64 字符串
 * @param {string} fallback - 解码失败回退
 * @returns {string} 解码后的字符串
 */
export function safeBase64Decode(value, fallback = '') {
  if (typeof value !== 'string' || value === '') return fallback;
  try {
    const normalized = normalizeBase64(value);
    if (typeof atob === 'function') return atob(normalized);
    // eslint-disable-next-line no-undef
    if (typeof Buffer !== 'undefined') return Buffer.from(normalized, 'base64').toString('utf8');
    return fallback;
  } catch (error) {
    return fallback;
  }
}

function normalizeBase64(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').trim();
  const paddingLength = normalized.length % 4;
  if (!paddingLength) return normalized;
  return normalized + '='.repeat(4 - paddingLength);
}
// ============ 响应判定与解包（兼容当前 request 行为）===========

/**
 * 判断业务是否成功
 * @param {*} response - request 返回值（可能是对象/数组/原始数据）
 * @returns {boolean} 是否成功
 */
export function isSuccess(response) {
  if (response == null) return false;
  if (response instanceof Error) return false;
  if (Array.isArray(response)) return true;
  if (typeof response !== 'object') return true;

  const code = response.code;
  if (code == null) return true;
  return String(code) === '200';
}

/**
 * 解包 data（常见结构：{code,msg,data}）
 * @param {*} response - request 返回值
 * @param {*} fallback - 无法解包时回退值
 * @returns {*} data 或原始值
 */
export function unwrapData(response, fallback = undefined) {
  if (response == null) return fallback;
  if (response instanceof Error) return fallback;
  if (Array.isArray(response)) return response;
  if (typeof response === 'object') {
    if ('data' in response) return response.data;
    return response;
  }
  return response;
}

/**
 * 从候选列表中取第一个满足条件的值。
 * @template T
 * @param {T[]} candidates - 候选值数组。
 * @param {(candidate: T) => *} resolver - 候选值解析函数；返回 undefined 表示未命中。
 * @returns {*|undefined} 命中结果；若没有候选满足条件则返回 undefined。
 */
function pickFirstCandidate(candidates, resolver) {
  for (const candidate of candidates) {
    const resolved = resolver(candidate);
    if (typeof resolved !== 'undefined') return resolved;
  }
  return undefined;
}

/**
 * 从多个候选中取第一个真实数组。
 * @param {...*} candidates - 列表候选。
 * @returns {Array|undefined} 命中的数组。
 */
function pickFirstArray(...candidates) {
  return pickFirstCandidate(candidates, (candidate) => (Array.isArray(candidate) ? candidate : undefined));
}

/**
 * 从多个候选中取第一个有限数字。
 * @param {...*} candidates - 数值候选。
 * @returns {number|undefined} 命中的有限数字。
 */
function pickFirstFiniteNumber(...candidates) {
  return pickFirstCandidate(candidates, (candidate) => {
    const parsed = ensureNumber(candidate, Number.NaN);
    return Number.isFinite(parsed) ? parsed : undefined;
  });
}

/**
 * 提取 rows/total（兼容 rows/total 或 data.rows/data.total）
 * @param {*} response - request 返回值
 * @returns {{rows: Array, total: number}} 列表与总数
 */
export function getRowsTotal(response) {
  if (Array.isArray(response)) return { rows: response, total: response.length };

  const root = ensureObject(response, {});
  // 部分接口直接返回 { data: [] } 作为列表
  if (Array.isArray(root.data)) {
    const rows = root.data;
    const total = pickFirstFiniteNumber(root.total, root.count, root.totalCount) ?? rows.length;
    return { rows, total };
  }

  const data = ensureObject(root.data, {});

  const rows = pickFirstArray(root.rows, root.list, data.rows, data.list, data.records, data.items) ?? [];

  const total =
    pickFirstFiniteNumber(root.total, root.count, root.totalCount, data.total, data.count, data.totalCount) ??
    rows.length;

  return { rows, total };
}

/**
 * 提取 msg（兼容 Error / string / {msg|message}）
 * @param {*} responseOrError - request 返回值或 Error
 * @param {string} fallback - 缺失时回退文案
 * @returns {string} 文案
 */
export function getMsg(responseOrError, fallback = '操作失败') {
  if (responseOrError == null) return fallback;
  if (typeof responseOrError === 'string') return responseOrError || fallback;
  if (responseOrError instanceof Error) return responseOrError.message || fallback;
  if (typeof responseOrError === 'object') {
    return responseOrError.msg || responseOrError.message || fallback;
  }
  return fallback;
}
