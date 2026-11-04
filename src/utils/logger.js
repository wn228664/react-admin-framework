/**
 * 模块职责：集中控制开发日志级别，提供页面和错误边界共用的输出入口。
 * log/info/debug 仅开发环境输出，warn/error 保留生产故障信号；参数不在这里自动脱敏。
 * 调用方只传可公开的诊断字段，不把凭证、请求头、个人资料或响应全文传进日志。
 */
// 构建器会替换 NODE_ENV，生产包关闭普通调试输出；错误输出由调用方控制内容。
const isDev = process.env.NODE_ENV === 'development';
export default {
  /** 开发日志，args 必须是调用方已脱敏的诊断字段；生产不输出。 */
  log: (.../* `args`：开发调试的公开参数序列；此级别仅开发输出，原始请求/凭证应在调用前剔除。 */ args) => {
    if (isDev) console.log(...args);
  },
  /** 开发信息，适合非敏感状态定位；不会在生产构建中打印。 */
  info: (.../* `args`：开发信息级别的公开字段；此方法不做序列化或脱敏，生产不调用 console.info。 */ args) => {
    if (isDev) console.info(...args);
  },
  /** 仅开发阶段的详细诊断；不要传文件二进制、完整响应或凭证。 */
  debug: (.../* `args`：开发细节诊断参数；应控制体积并排除完整响应，生产不输出。 */ args) => {
    if (isDev) console.debug(...args);
  },
  /** 生产也保留的可恢复异常信号；args 的敏感信息处理归产生错误的服务边界。 */
  warn: (.../* `args`：可恢复异常的公开诊断字段，生产仍输出，因此不得夹带 Cookie、headers 或敏感正文。 */ args) =>
    console.warn(...args),
  /** 生产故障输出；不在这里吞异常、自动重试或把失败改成成功返回。 */
  error: (.../* `args`：生产故障的公开字段；错误边界应先投影类型/代码，不能直接传 AxiosError 原对象。 */ args) =>
    console.error(...args),
};

// ───── 模块结束：src/utils/logger.js ─────
