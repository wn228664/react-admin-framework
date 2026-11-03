/**
 * @file src/utils/antdStaticBridge.js
 * @description 把 Ant Design 的静态 `message` / `Modal` 方法桥接到 `App.useApp()` 返回的上下文实例，避免动态主题场景下继续触发“Static function can not consume context”警告。
 */
import { message, Modal } from 'antd';
const MESSAGE_METHOD_NAMES = ['open', 'success', 'error', 'info', 'warning', 'loading', 'destroy'];

const MODAL_METHOD_NAMES = ['confirm', 'info', 'success', 'warning', 'error', 'destroyAll'];

const originalMessageMethods = captureOriginalMethods(message, MESSAGE_METHOD_NAMES);

const originalModalMethods = captureOriginalMethods(Modal, MODAL_METHOD_NAMES);

/**
 * 采集目标对象的一组原始方法。
 * 使用场景：桥接前先保留 antd 自带实现，避免后续恢复时只能依赖“猜测当前方法”。
 * @param {Record<string, Function>} targetApi - 需要采集方法的目标对象。
 * @param {string[]} methodNames - 需要采集的方法名列表。
 * @returns {Record<string, Function>} 方法名到原始实现的映射。
 */
function captureOriginalMethods(targetApi, methodNames) {
  const methodMap = {};

  methodNames.forEach((methodName) => {
    if (typeof targetApi?.[methodName] === 'function') {
      methodMap[methodName] = targetApi[methodName];
    }
  });

  return methodMap;
}

/**
 * 把来源实例的方法逐项覆盖到目标静态对象上。
 * 关键约束：只覆盖显式存在的方法，避免 antd 版本差异导致把 `undefined` 写进目标对象。
 * @param {Record<string, Function>} targetApi - 目标静态对象，例如 antd.message。
 * @param {Record<string, Function>} sourceApi - 来源实例对象，例如 App.useApp().message。
 * @param {string[]} methodNames - 允许覆盖的方法名白名单。
 */
function patchApiMethods(targetApi, sourceApi, methodNames) {
  methodNames.forEach((methodName) => {
    if (typeof sourceApi?.[methodName] === 'function') {
      targetApi[methodName] = sourceApi[methodName].bind(sourceApi);
    }
  });
}

/**
 * 把已保存的原始静态方法写回目标对象。
 * 关键约束：恢复阶段必须写回“原始函数引用”本身，而不是再次绑定到临时 map，否则开发态热更新后可能改变原有 `this` 语义。
 * @param {Record<string, Function>} targetApi - 需要恢复方法的目标对象。
 * @param {Record<string, Function>} originalMethods - 启动阶段采集的原始方法映射。
 * @param {string[]} methodNames - 允许恢复的方法名白名单。
 */
function restoreApiMethods(targetApi, originalMethods, methodNames) {
  methodNames.forEach((methodName) => {
    if (typeof originalMethods?.[methodName] === 'function') {
      targetApi[methodName] = originalMethods[methodName];
    }
  });
}

/**
 * 把 `App.useApp()` 返回的上下文实例桥接到 antd 静态 API。
 * @param {{ messageApi?: Record<string, Function>, modalApi?: Record<string, Function> }} appApis - `App.useApp()` 收敛后的实例集合。
 */
export function bindAntdStaticApis(appApis) {
  const messageApi = appApis?.messageApi;

  const modalApi = appApis?.modalApi;

  patchApiMethods(message, messageApi, MESSAGE_METHOD_NAMES);
  patchApiMethods(Modal, modalApi, MODAL_METHOD_NAMES);
}

/**
 * 恢复 antd 的原始静态实现。
 * 使用场景：开发态热更新或根容器卸载时，确保后续重新绑定前处于可预测状态。
 */
export function restoreAntdStaticApis() {
  restoreApiMethods(message, originalMessageMethods, MESSAGE_METHOD_NAMES);
  restoreApiMethods(Modal, originalModalMethods, MODAL_METHOD_NAMES);
}
