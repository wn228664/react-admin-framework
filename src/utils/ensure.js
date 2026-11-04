/**
 * 模块职责：为明确需要宽松显示解析的调用点提供数字与数组收窄，不承担接口 Schema 校验。
 * 数值函数允许带千位逗号的字符串，并允许 Number 对布尔等其它值做转换；robust.ensureNumber 更严格。
 * fallback 由调用方提供，非法业务输入不能靠这里的默认值当成服务端校验成功。
 */

/**
 * 数值兜底：把可能为 string/number/null/undefined 的输入收敛为可用 number。
 * @param {unknown} value 待兜底的值
 * @param {number} [fallback=0] 无法解析时回退值
 * @returns {number} 有限的转换结果或 fallback 原值；fallback 由调用方保证符合自身显示规则。
 * Symbol 或自定义转换抛错时回退；BigInt 转 number 可能丢失整数精度，不适合原样承载标识符。
 * @example
 *   ensureNumber(undefined) // 0
 *   ensureNumber('1,234.50') // 1234.5
 */
export function ensureNumber(value, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'bigint') {
    // `num`：由 bigint 经 Number 转换的显示数值；仅有限值可返回，转换不保证保留超大整数精度。
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  if (value == null || value === '') {
    return fallback;
  }

  // `normalized`：字符串先移除千位逗号和两端空白，其余值保留原引用，交给受异常保护的 Number 转换。
  const normalized = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
  try {
    // `num`：当前输入的宽松转换结果，只有有限数进入显示；NaN/Infinity 使用调用方 fallback。
    const num = Number(normalized);
    return Number.isFinite(num) ? num : fallback;
  } catch {
    return fallback;
  }
}

/**
 * 数组兜底：确保返回值为数组，避免对非数组进行 map/reduce。
 * @template T
 * @param {unknown} value 待兜底的值
 * @param {T[]} [fallback=[]] 无法解析时回退数组
 * @returns {T[]} 结果数组
 */
export function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

// ───── 模块结束：src/utils/ensure.js ─────
