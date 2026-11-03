/**
 * @file src/components/FullscreenToggle/utils.js
 * @description FullscreenToggle 共享 helper，统一处理全屏状态判定、事件列表与标准/前缀 API 兼容调用。
 * @example
 * const isFullscreen = isFullscreenActive(document);
 * requestFullscreenOnElement(document.documentElement);
 */
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
 * 请求指定元素进入全屏，按标准 API 优先、前缀 API 回退的顺序执行。
 * @param {*} element 待进入全屏的元素。
 * @returns {boolean} 是否成功找到可调用的全屏请求方法。
 */
export function requestFullscreenOnElement(element) {
  const safeElement = element && typeof element === 'object' ? element : null;
  if (!safeElement) {
    return false;
  }

  if (typeof safeElement.requestFullscreen === 'function') {
    safeElement.requestFullscreen();
    return true;
  }
  if (typeof safeElement.webkitRequestFullscreen === 'function') {
    safeElement.webkitRequestFullscreen();
    return true;
  }
  if (typeof safeElement.mozRequestFullScreen === 'function') {
    safeElement.mozRequestFullScreen();
    return true;
  }
  if (typeof safeElement.msRequestFullscreen === 'function') {
    safeElement.msRequestFullscreen();
    return true;
  }
  return false;
}

/**
 * 请求当前 document 退出全屏，按标准 API 优先、前缀 API 回退的顺序执行。
 * @param {*} targetDocument 待退出全屏的 document 对象。
 * @returns {boolean} 是否成功找到可调用的退出全屏方法。
 */
export function exitFullscreenFromDocument(targetDocument) {
  const safeDocument = targetDocument && typeof targetDocument === 'object' ? targetDocument : null;
  if (!safeDocument) {
    return false;
  }

  if (typeof safeDocument.exitFullscreen === 'function') {
    safeDocument.exitFullscreen();
    return true;
  }
  if (typeof safeDocument.webkitExitFullscreen === 'function') {
    safeDocument.webkitExitFullscreen();
    return true;
  }
  if (typeof safeDocument.mozCancelFullScreen === 'function') {
    safeDocument.mozCancelFullScreen();
    return true;
  }
  if (typeof safeDocument.msExitFullscreen === 'function') {
    safeDocument.msExitFullscreen();
    return true;
  }
  return false;
}
