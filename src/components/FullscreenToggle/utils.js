/**
 * 模块职责：封装全屏能力检测、标准/前缀调用和事件名称，不依赖 React 或全局 document。
 * 返回的布尔值只表示找到了方法并发起调用；实际进入/退出由浏览器 change 事件确认。
 * 同步异常及 Promise 拒绝统一交给 onError；适配器不做权限推断、自动重试或 UI 状态发布。
 */
// `FULLSCREEN_CHANGE_EVENTS`：标准和历史前缀全屏 change 事件名，只供同一实例绑定/解绑真实状态通知。
export const FULLSCREEN_CHANGE_EVENTS = Object.freeze([
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
]);
/**
 * 判断当前 document 是否处于全屏态，兼容历史浏览器前缀字段。
 * @param {*} targetDocument 待判定的 document 对象。
 * @returns {boolean} 是否已进入全屏。
 */
export function isFullscreenActive(targetDocument) {
  // `safeDocument`：用于状态探测的有效 document 对象；无对象时保守返回非全屏。
  const safeDocument = targetDocument && typeof targetDocument === 'object' ? targetDocument : null;
  if (!safeDocument) {
    return false;
  }

  return Boolean(
    safeDocument.fullscreenElement ||
    safeDocument.webkitFullscreenElement ||
    safeDocument.mozFullScreenElement ||
    safeDocument.msFullscreenElement
  );
}

/**
 * 向指定元素发起全屏请求，按标准、WebKit、Mozilla、MS 顺序选择首个方法。
 * @param {Object} element 浏览器元素；缺少能力时不产生副作用。
 * @param {Function} [onError] 接收同步错误或异步拒绝，回调应同步且不抛错。
 * @returns {boolean} 是否成功发起平台调用，不代表浏览器最终允许进入。
 */
export function requestFullscreenOnElement(element, onError) {
  // `safeElement`：发起进入请求的有效元素 owner；方法调用保留 this，不创建新 DOM。
  const safeElement = element && typeof element === 'object' ? element : null;
  if (!safeElement) {
    return false;
  }

  return invokeFullscreenMethod(
    safeElement,
    ['requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullScreen', 'msRequestFullscreen'],
    onError
  );
}

/**
 * 向指定 document 发起退出，采用与进入相同的前缀兼容和失败通道。
 * @param {Object} targetDocument 当前文档对象，不强制读取全局。
 * @param {Function} [onError] 平台错误反馈，调用方负责可恢复的用户提示。
 * @returns {boolean} 是否已发起调用；无能力/同步失败为 false。
 */
export function exitFullscreenFromDocument(targetDocument, onError) {
  // `safeDocument`：用于退出的平台 document owner，非对象不发起调用。
  const safeDocument = targetDocument && typeof targetDocument === 'object' ? targetDocument : null;
  if (!safeDocument) {
    return false;
  }

  return invokeFullscreenMethod(
    safeDocument,
    ['exitFullscreen', 'webkitExitFullscreen', 'mozCancelFullScreen', 'msExitFullscreen'],
    onError
  );
}

/**
 * 在目标对象上调用首个可用方法，并消费其可能返回的 Promise。
 * @param {Object} target 已完成空值检查的平台 owner，调用时保留 this。
 * @param {string[]} names 按优先级排列的方法名，不执行缺失的方法。
 * @param {Function} [onError] 同步且不抛错的错误观察者。
 * @returns {boolean} 方法不存在或同步抛错为 false，异步拒绝通过 onError 报告。
 */
function invokeFullscreenMethod(target, names, onError = () => {}) {
  // `method`：按标准/前缀优先顺序找到的首个可调用方法名，缺失时返回 false。
  const method = names.find(
    (/* `name`：本次能力探测的方法名候选，只检查函数存在性，不提前执行平台调用。 */ name) =>
      typeof target[name] === 'function'
  );
  if (!method) return false;
  try {
    Promise.resolve(target[method]()).catch(onError);
    return true;
  } catch (/* `error`：平台调用同步抛出的异常；交给公开反馈回调，并用 false 表示未成功发起。 */ error) {
    onError(error);
    return false;
  }
}

// ───── 模块结束：src/components/FullscreenToggle/utils.js ─────
