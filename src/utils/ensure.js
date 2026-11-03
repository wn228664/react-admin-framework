/**
 * @file src/utils/ensure.js
 * @description 类型安全转换工具，将不确定类型的输入转换为期望的数字或数组，避免 undefined、null 等异常值导致的运行时错误。
 */

/**
 * 数值兜底：把可能为 string/number/null/undefined 的输入收敛为可用 number。
 * @param {unknown} value 待兜底的值
 * @param {number} [fallback=0] 无法解析时回退值
 * @returns {number} 解析后的数值（保证为有限数字）
 * @example
 *   ensureNumber(undefined) // 0
 *   ensureNumber('1,234.50') // 1234.5
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

  const normalized = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
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
