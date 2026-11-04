/**
 * 模块职责：集中处理渲染层类型收窄、URI/Base64 解码和常见分页形状适配。
 * 这些兜底用于界面稳定性，不替代字段校验；isSuccess 必须由服务适配器提供同步判定函数。
 * getRowsTotal 只适配列表/总数的结构，不判断权限或成功信封；写操作错误必须向调用方明确传播。
 */
// ============ 类型兜底（避免 map/toFixed 直接崩）===========

/**
 * 为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 * @param {*} value 接口或状态中的列表候选；仅 Array.isArray 命中才接受。
 * @param {Array} [fallback=[]] 非数组输入时原样返回的默认数组，调用方应保证其类型。
 * @returns {Array} 输入或 fallback 的原引用，不复制、不深拷贝，也不验证每个元素。
 */
export function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

/**
 * 为字段读取选择普通对象，拒绝 null、数组和 Date 等其它对象标签。
 * @param {*} value 数据信封候选，不会反序列化字符串。
 * @param {Object} [fallback={}] 不符合对象形状时使用的默认对象。
 * @returns {Object} 原对象或 fallback 引用；不复制属性，也不验证字段 Schema。
 */
export function ensureObject(value, fallback = {}) {
  if (!value || typeof value !== 'object') return fallback;
  if (Array.isArray(value)) return fallback;
  if (Object.prototype.toString.call(value) !== '[object Object]') return fallback;
  return value;
}

/**
 * 把可确定的标量转成展示文本，避免对象意外渲染为 [object Object]。
 * @param {*} value 字符串、有限数、bigint 或布尔值；其它类型不做自定义 toString 转换。
 * @param {string} [fallback=""] 非法类型或非有限数的回退文本。
 * @returns {string} 字符串原值或转换结果；不 trim、不转义 HTML，调用方选择正确渲染方式。
 */
export function ensureString(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return fallback;
}

/**
 * 按有限数或数字文本规则提取显示值，不调用对象的 valueOf。
 * @param {*} value 仅 number、bigint 或字符串；字符串允许千位逗号，空白不是 0。
 * @param {number} [fallback=0] 无法解析时原样返回；内部可用 NaN 表示未命中。
 * @returns {number} 有限转换结果或 fallback，不做取整、精度补偿或业务范围校验。
 */
export function ensureNumber(value, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'bigint') {
    // `num`：bigint 转为 number 后的候选值；有限性检查防止溢出，不能把它当作无损标识符转换。
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  if (value == null || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    // 兼容 "1,234.50" 这类带千分位分隔符的字符串
    // `normalized`：移除千位分隔逗号和首尾空白后的数字文本；空白输入不被 Number 误转换为 0。
    const normalized = value.replace(/,/g, '').trim();
    if (normalized === '') return fallback;
    // `parsed`：数字文本转换结果；NaN 和无穷值均沿用 fallback，不隐式接受布尔或对象。
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

// ============ 安全解析（替换散落 try/catch）===========

/**
 * 读取非敏感持久化快照或 JSON 文本，解析异常交回调用方给定默认值。
 * @param {*} input 字符串会 JSON.parse，已是对象则原样返回，其它标量使用 fallback。
 * @param {*} [fallback=null] 缺值、非法文本或不支持类型时返回的结果。
 * @returns {*} 解析值、对象原引用或 fallback；不验证结果字段，不深拷贝已有对象。
 */
export function safeJsonParse(input, fallback = null) {
  if (input == null) return fallback;
  if (typeof input !== 'string') return typeof input === 'object' ? input : fallback;
  try {
    return JSON.parse(input);
  } catch (/* `error`：JSON 文本解析错误；消费当前异常并返回 fallback，不把原始输入写日志。 */ error) {
    return fallback;
  }
}

/**
 * 读取 Umi 构建期注入的公开 API 基址，组件和上传入口共用此来源。
 * @param {string} [fallback=/api] 常量缺失或为空时使用的基址。
 * @returns {string} 配置原值或 fallback，不拼路径或验证目标来源；认证实例仍需固定可信基址。
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
  } catch (/* `error`：对象枚举过程抛出的异常；属性 getter 等失败时统一返回空数组。 */ error) {
    return [];
  }
}

/**
 * 在可能为空的输入上枚举自有可枚举键，复用统一异常边界。
 * @param {*} value 待枚举的输入；null/undefined 直接返回空数组。
 * @returns {string[]} Object.keys 结果或失败后的空数组，不修改输入。
 */
export function safeObjectKeys(value) {
  return runSafeObjectExtractor(value, Object.keys);
}

/**
 * 枚举自有可枚举属性值；读取属性 getter 时的异常也由共同边界接住。
 * @param {*} value 待枚举对象或可被平台包装的标量。
 * @returns {Array} Object.values 结果或空数组，值仍保持原对象引用。
 */
export function safeObjectValues(value) {
  return runSafeObjectExtractor(value, Object.values);
}

/**
 * 取得可枚举的键值对，供未知数据形状的展示适配使用。
 * @param {*} value 待枚举输入，空值及平台枚举异常不继续向界面抛出。
 * @returns {Array<[string,*]>} 平台 entries 结果或空数组，不排序或复制属性值。
 */
export function safeObjectEntries(value) {
  return runSafeObjectExtractor(value, Object.entries);
}

/**
 * 为路径片段或展示名称解码百分号编码，失败时保留指定展示回退。
 * @param {*} value 必须为字符串，不对其它类型隐式字符串化。
 * @param {string} [fallback=""] 非字符串或非法百分号序列时使用的文本。
 * @returns {string} URI 解码结果或 fallback；不额外把 + 转为空格，也不保证 URL 可信。
 */
export function safeDecodeURIComponent(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  try {
    return decodeURIComponent(value);
  } catch (/* `error`：百分号编码不完整或非法 URI 的解码错误；按调用方 fallback 恢复展示。 */ error) {
    return fallback;
  }
}

/**
 * 规整 URL-safe 字母表后调用当前环境的 Base64 解码器，失败返回默认文本。
 * @param {*} value 非空 Base64 字符串；空值或其它类型不尝试解码。
 * @param {string} [fallback=""] 平台能力缺失或解码抛错时的回退。
 * @returns {string} 浏览器 atob 的字节串、Node Buffer 的 UTF-8 文本或 fallback。
 * 跨环境 Unicode 必须由调用方明确字符集；本函数不承担严格 Base64 输入验证。
 */
export function safeBase64Decode(value, fallback = '') {
  if (typeof value !== 'string' || value === '') return fallback;
  try {
    // `normalized`：URL-safe Base64 规整后的文本；浏览器 atob 与 Node Buffer 分别消费该字母表。
    const normalized = normalizeBase64(value);
    if (typeof atob === 'function') return atob(normalized);
    // eslint-disable-next-line no-undef
    if (typeof Buffer !== 'undefined') return Buffer.from(normalized, 'base64').toString('utf8');
    return fallback;
  } catch (/* `error`：Base64 规整或平台解码失败；只撤销本次结果，不影响其它调用。 */ error) {
    return fallback;
  }
}

/**
 * 把 URL-safe Base64 字母表转成浏览器解码形式并补齐四位分组。
 * @param {string} value 调用方已确认的字符串；这里只规整编码，不解释文本字符集。
 * @returns {string} 可交给 atob/Buffer 的候选串，非法内容仍由后续解码器拒绝。
 */
function normalizeBase64(value) {
  // `normalized`：替换 -/_ 并修剪空白后的 Base64 候选串，非法字符的处置仍由后续解码器决定。
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').trim();
  // `paddingLength`：当前文本长度除以 4 的余数；为 0 时无需补位，否则补到下一个四字符分组。
  const paddingLength = normalized.length % 4;
  if (!paddingLength) return normalized;
  return normalized + '='.repeat(4 - paddingLength);
}
// ============ 响应判定与解包（兼容当前 request 行为）===========

/**
 * 按接入服务的显式合同判断业务结果；不预置 code/success 等字段规则。
 * @param {*} response 服务层收到的原始结果。
 * @param {Function} validate 服务适配器提供的同步判定函数，必须明确返回 true 才接受。
 * @returns {boolean} 判定结果；缺少 validate 或校验函数抛错时向调用方抛出。
 */
export function isSuccess(response, validate) {
  if (typeof validate !== 'function') throw new TypeError('必须提供业务结果判定函数');
  return validate(response) === true;
}

/**
 * 按传输层已返回的原始响应选择 data 字段，不判断业务成功或回退真实空数据。
 * @param {*} response 普通响应、数组或 Error；数组直接保留，Error/空值使用 fallback。
 * @param {*} [fallback=undefined] 仅响应缺失或为 Error 时使用的默认值。
 * @returns {*} 存在 data 键时返回其原值，即使是 undefined；其余返回响应本身。
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
  // `candidate`：按调用方优先级遍历的单个候选，空数组、0、false 等均由 resolver 决定是否接受。
  for (const candidate of candidates) {
    // `resolved`：resolver 对当前候选的结果；只有 undefined 表示继续搜索，null 或 0 都可以是有效命中。
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
  return pickFirstCandidate(
    candidates,
    (/* `candidate`：候选数组项；映射只接受真实数组并保留其原引用，未命中返回 undefined。 */ candidate) =>
      Array.isArray(candidate) ? candidate : undefined
  );
}

/**
 * 从多个候选中取第一个有限数字。
 * @param {...*} candidates - 数值候选。
 * @returns {number|undefined} 命中的有限数字。
 */
function pickFirstFiniteNumber(...candidates) {
  return pickFirstCandidate(
    candidates,
    (/* `candidate`：总数字段候选；当前回调只返回有限数或 undefined，不判断该数是否符合业务范围。 */ candidate) => {
      // `parsed`：候选总数字段的数值转换结果；NaN 是未命中哨兵，0 仍会保留。
      const parsed = ensureNumber(candidate, Number.NaN);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  );
}

/**
 * 提取 rows/total（兼容 rows/total 或 data.rows/data.total）
 * @param {*} response - request 返回值
 * @returns {{rows: Array, total: number}} 列表与总数
 */
export function getRowsTotal(response) {
  if (Array.isArray(response)) return { rows: response, total: response.length };

  // `root`：把响应收窄为普通对象后的外层信封；缺少对象时用空对象读取可选字段。
  const root = ensureObject(response, {});
  // 部分接口直接返回 { data: [] } 作为列表
  if (Array.isArray(root.data)) {
    // `rows`：response.data 已确认是数组时直接复用它；本函数不复制或修改列表。
    const rows = root.data;
    // `total`：外层 total/count/totalCount 的首个有限数；均未命中时使用 data 数组长度。
    const total = pickFirstFiniteNumber(root.total, root.count, root.totalCount) ?? rows.length;
    return { rows, total };
  }

  // `data`：外层 data 的对象形状，只有读取候选列表/总数的作用，不表示业务请求成功。
  const data = ensureObject(root.data, {});

  // `rows`：按外层 rows/list、内层 rows/list/records/items 的优先级取首个数组；显式空数组也会命中。
  const rows = pickFirstArray(root.rows, root.list, data.rows, data.list, data.records, data.items) ?? [];

  // `total`：按既定字段优先级取总数，缺失才使用当前列表长度；非负/整数等约束由服务适配器校验。
  const total =
    pickFirstFiniteNumber(root.total, root.count, root.totalCount, data.total, data.count, data.totalCount) ??
    rows.length;

  return { rows, total };
}

/**
 * 为提示组件选择文本错误说明，不把对象/数字作为 React 子节点输出。
 * @param {*} responseOrError 可为非空文本、Error 或含 msg/message 的响应对象。
 * @param {string} [fallback=操作失败] 候选字段没有非空字符串时的公开回退文案。
 * @returns {string} Error 的合法 message、对象中优先 msg 后 message 的合法文本，或 fallback。
 * 本函数只选择文案，不做敏感信息脱敏，也不将错误视为业务成功。
 */
export function getMsg(responseOrError, fallback = '操作失败') {
  if (responseOrError == null) return fallback;
  if (typeof responseOrError === 'string') return responseOrError || fallback;
  if (responseOrError instanceof Error)
    return typeof responseOrError.message === 'string' && responseOrError.message ? responseOrError.message : fallback;
  if (typeof responseOrError === 'object') {
    return (
      [responseOrError.msg, responseOrError.message].find(
        (
          /* `message`：依次来自 msg/message 的候选文案；映射只接受非空字符串，不把对象或数字直接交给 React 渲染。 */ message
        ) => typeof message === 'string' && message
      ) || fallback
    );
  }
  return fallback;
}

// ───── 模块结束：src/utils/robust.js ─────
