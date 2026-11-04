/**
 * 模块职责：提供原始 HTTP 传输与会话边界，服务适配器负责解释业务响应和展示错误。
 * 认证调用只能使用固定 API 基址下的相对路径；成功/失败交付前同时核对凭证值与会话代次。
 * 公开传输必须显式 authenticated:false，不自动携带应用凭证、不清理会话，也不自动重试写操作。
 */
// Axios 执行可取消传输，AxiosError 保留 INVALID_PATH/SESSION_CHANGED 等稳定错误码。
/**
 * `axios`：创建独立 HTTP 实例，固定可信来源与拦截器，不使用任意请求覆盖认证基址。
 * `AxiosError`：构造可识别的路径/会话错误，保留 code 供调用方分派，不直接记录原始 config。
 */
import axios, { AxiosError } from 'axios';
// 构建期 API_BASE_URL 在这里读取，缺省使用同站 /api，避免页面各自拼环境地址。
/**
 * `getApiBaseUrl`：读取 Umi 构建期注入的公开 API 基址，组件和上传入口共用此来源。
 */
import { getApiBaseUrl } from './robust';
// 认证工具提供当前 Cookie、会话代次与默认 401 清理动作；请求层不拥有登录页面。
/**
 * `getToken`：读取当前会话值；浏览器禁止 Cookie 或 API 抛错时保持未认证态。
 * `getSessionRevision`：读取当前页已发起的会话修改次数，供发请求时拍快照；读取本身不访问 Cookie。
 * `removeToken`：撤销此页对当前凭证的消费并尝试删除 Cookie；不会向服务端发送退出请求。
 */
import { getToken, getSessionRevision, removeToken } from './auth';

/**
 * 创建一个 API 来源固定的 Axios 实例，默认超时 30000 毫秒。
 * @param {Object} [options] baseURL 为可信 API 基址；readToken/readRevision 为同步当前会话读取器。
 * @param {Function} [options.onUnauthorized] 只有当前认证请求的 HTTP 401 才调用，默认移除 Cookie。
 * @param {Function} [options.adapter] 测试或宿主可注入 Axios adapter；它属于可信代码边界。
 * @returns {import("axios").AxiosInstance} 成功直接返回 response.data，不预置业务成功码。
 * 单次配置 authenticated:false 可访问公开地址；取消、超时和 HTTP 错误通过 Promise 拒绝。
 * 缺少相对路径或覆盖 baseURL 为 INVALID_PATH；旧会话成功和失败均为 SESSION_CHANGED。
 */
export function createHttpClient({
  /* `baseURL`：实例固定的可信 API 基址，默认读取公开构建配置；不是单次请求可以替换的用户输入。 */ baseURL = getApiBaseUrl(),
  /* `readToken`：同步凭证读取器，默认 getToken；既在请求开始拍照，也在结果交付时核对当前身份。 */ readToken = getToken,
  /* `readRevision`：同步会话代次读取器，默认 getSessionRevision；区分 token 值相同的两个认证周期。 */ readRevision = getSessionRevision,
  /* `onUnauthorized`：当前认证请求的 401 清理回调，默认 removeToken；公开传输和旧会话不会触发。 */ onUnauthorized = removeToken,
  /* `adapter`：可信 Axios 传输适配器，通常留空使用浏览器实现；测试通过它控制返回与失败。 */ adapter,
} = {}) {
  // `client`：本次 createHttpClient 独立创建的 Axios 实例，固定可信 baseURL 和 30000ms 超时；拦截器仅属于该实例。
  const client = axios.create({ baseURL, timeout: 30000, adapter });
  /**
   * 核对当前响应是否仍属于发起时的身份，未拍会话快照的公开/配置错误不参与判断。
   * @param {Object|undefined} config Axios 最终请求配置，快照由本实例请求拦截器写入。
   * @returns {boolean} 凭证值或代次任一变化即失效，不把旧 401 交给新会话清理。
   */
  const changedSession = (config) =>
    config?.frameworkSessionCaptured &&
    (config.sessionToken !== readToken() || config.sessionRevision !== readRevision());
  /**
   * 为失效请求建立可辨识的拒绝结果，不把旧响应正文返回给后续页面。
   * @param {Object} config 原请求配置，仅交给调用方错误处理，不应原样写日志。
   * @returns {AxiosError} code 固定为 SESSION_CHANGED。
   */
  const staleError = (config) => new AxiosError('会话已变化，请重新操作', 'SESSION_CHANGED', config);
  client.interceptors.request.use(
    (/* `config`：Axios 请求拦截器收到的配置；先固定来源，再写入本实例拥有的认证与会话快照字段。 */ config) => {
      config.frameworkAuthenticated = config.authenticated !== false;
      if (config.frameworkAuthenticated) {
        if (
          typeof config.url !== 'string' ||
          /[\\\s\p{Cc}]/u.test(config.url) ||
          /^[a-z][a-z\d+.-]*:/i.test(config.url) ||
          config.url.startsWith('//') ||
          config.baseURL !== baseURL
        ) {
          throw new AxiosError('认证请求必须使用当前 API 的相对路径', 'INVALID_PATH', config);
        }
        // `token`：请求开始时从可信 readToken 取得的不透明凭证；同时拍入会话快照，只在宿主没有显式 Authorization 时注入。
        const token = readToken();
        config.frameworkSessionCaptured = true;
        config.sessionToken = token;
        config.sessionRevision = readRevision();
        if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }
  );
  client.interceptors.response.use(
    (/* `response`：当前 HTTP 成功响应；先确认身份仍有效，再仅交付 data 原值，不判断业务成功。 */ response) => {
      if (changedSession(response.config)) throw staleError(response.config);
      return response.data;
    },
    (/* `error`：当前传输失败，可能携带配置与响应；只做会话/401 分派并拒绝，不直接输出原对象。 */ error) => {
      if (changedSession(error.config)) return Promise.reject(staleError(error.config));
      if (error.response?.status === 401 && error.config?.frameworkAuthenticated) onUnauthorized();
      return Promise.reject(error);
    }
  );
  return client;
}

export default createHttpClient();

// ───── 模块结束：src/utils/request.js ─────
