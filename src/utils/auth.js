/**
 * 模块职责：集中读写后台会话 Cookie，并发布本进程的会话代次供请求层隔离旧响应。
 * setToken/removeToken 发起即推进代次，存储失败也不能让已开始的旧会话请求重新交付。
 * Cookie 对前端脚本可读，不替代服务端鉴权、会话撤销或 CSRF 防护；调用方不得记录凭证。
 */

// js-cookie 处理 Cookie 编解码；这里只保存同名会话值，不把凭证写入普通偏好缓存。
/**
 * `Cookies`：读写非敏感偏好或明确会话 Cookie；属性访问/读写异常由当前边界处理。
 */
import Cookies from 'js-cookie';

// 中性会话键只属于此框架实例；新应用如需并存账号体系，应在集成时统一调整键名。
const TokenKey = 'framework-Admin-Token';
// 单调递增的本页代次补足“相同 Token 重新登录”的身份变化；跨页签变化另由请求层比较 Cookie 值。
let sessionRevision = 0;

/**
 * 读取当前页已发起的会话修改次数，供发请求时拍快照；读取本身不访问 Cookie。
 * @returns {number} 从 0 开始的进程内代次，刷新页面后重新计数。
 */
export function getSessionRevision() {
  return sessionRevision;
}

/**
 * 读取当前会话值；浏览器禁止 Cookie 或 API 抛错时保持未认证态。
 * @returns {string|undefined} 未设置或读取失败为 undefined，不在这里刷新或解码 Token。
 */
export function getToken() {
  try {
    return Cookies.get(TokenKey);
  } catch (/* `error`：当前 Cookie 读取异常，例如浏览器禁止访问；按未认证态返回 undefined，不输出凭证。 */ error) {
    return undefined;
  }
}

/**
 * 建立或替换当前会话；同值写入也视为新的身份周期。
 * @param {string} token 接入方取得的不透明凭证，Cookie 库负责存储编码。
 * @returns {boolean} Cookie API 未抛错为 true；浏览器是否最终持久化仍受其策略约束。
 */
export function setToken(token) {
  sessionRevision += 1;
  try {
    Cookies.set(TokenKey, token);
    return true;
  } catch (/* `error`：当前凭证写入异常；返回 false 供调用方反馈，但已经推进的会话代次不能回退。 */ error) {
    return false;
  }
}

/**
 * 撤销此页对当前凭证的消费并尝试删除 Cookie；不会向服务端发送退出请求。
 * @returns {boolean} 删除 API 未抛错为 true；失败时调用方应反馈，旧请求已按代次失效。
 */
export function removeToken() {
  sessionRevision += 1;
  try {
    Cookies.remove(TokenKey);
    return true;
  } catch (/* `error`：当前凭证删除异常；返回 false，仍保持旧请求已失效，不把 Cookie 异常当成服务端退出成功。 */ error) {
    return false;
  }
}

// ───── 模块结束：src/utils/auth.js ─────
