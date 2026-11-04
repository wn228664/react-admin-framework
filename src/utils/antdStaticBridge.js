/**
 * 模块职责：把旧式 message/Modal 静态入口绑定到根 App 上下文，统一主题、语言与弹层宿主。
 * 原始方法只捕获一次；根桥卸载时恢复，不创建第二套消息状态或把页面绑定到全局 ref。
 * 必须在 App.useApp() 可用后绑定；调用方承担业务成功判定与敏感信息脱敏。
 */
// Antd 的 message/Modal 是待桥接的静态对象，实际展示委托给根 App 实例。
/**
 * `message`：通过根桥显示公开反馈，不应直接消费原始请求配置或敏感响应。
 * `Modal`：提供原生弹窗与静态句柄，滚动约束和异步错误消费按本模块契约接入。
 */
import { message, Modal } from 'antd';
// `MESSAGE_METHOD_NAMES`：允许桥接的消息方法白名单；只替换这些公开入口，避免覆盖 Antd 其它静态属性。
const MESSAGE_METHOD_NAMES = ['open', 'success', 'error', 'info', 'warning', 'loading', 'destroy'];

// `MODAL_METHOD_NAMES`：允许桥接的静态弹窗方法白名单，与消息方法分开维护。
const MODAL_METHOD_NAMES = ['confirm', 'info', 'success', 'warning', 'error', 'destroyAll'];

// `originalMessageMethods`：模块初次加载时保存的消息函数引用；根桥卸载后按引用恢复，不继续持有已销毁 App 实例。
const originalMessageMethods = captureOriginalMethods(message, MESSAGE_METHOD_NAMES);

// `originalModalMethods`：模块初次加载时保存的 Modal 原始函数引用，不在重复绑定时覆盖基准。
const originalModalMethods = captureOriginalMethods(Modal, MODAL_METHOD_NAMES);

/**
 * 采集目标对象的一组原始方法。
 * 使用场景：桥接前先保留 antd 自带实现，避免后续恢复时只能依赖“猜测当前方法”。
 * @param {Record<string, Function>} targetApi - 需要采集方法的目标对象。
 * @param {string[]} methodNames - 需要采集的方法名列表。
 * @returns {Record<string, Function>} 方法名到原始实现的映射。
 */
function captureOriginalMethods(targetApi, methodNames) {
  // `methodMap`：本次采集产生的新映射，仅收集白名单中真实存在的函数，用来准确恢复原始 this 语义。
  const methodMap = {};

  methodNames.forEach((/* `methodName`：本次采集的白名单方法名；只在目标字段确实为函数时记录原引用。 */ methodName) => {
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
  methodNames.forEach(
    (
      /* `methodName`：本次绑定的白名单方法名；使用 sourceApi 绑定 this，保证上下文与所属 App 实例一致。 */ methodName
    ) => {
      if (typeof sourceApi?.[methodName] === 'function') {
        targetApi[methodName] = sourceApi[methodName].bind(sourceApi);
      }
    }
  );
}

/**
 * 把已保存的原始静态方法写回目标对象。
 * 关键约束：恢复阶段必须写回“原始函数引用”本身，而不是再次绑定到临时 map，否则开发态热更新后可能改变原有 `this` 语义。
 * @param {Record<string, Function>} targetApi - 需要恢复方法的目标对象。
 * @param {Record<string, Function>} originalMethods - 启动阶段采集的原始方法映射。
 * @param {string[]} methodNames - 允许恢复的方法名白名单。
 */
function restoreApiMethods(targetApi, originalMethods, methodNames) {
  methodNames.forEach(
    (/* `methodName`：本次恢复的白名单方法名；写回保存的原函数，不重新 bind 到临时映射。 */ methodName) => {
      if (typeof originalMethods?.[methodName] === 'function') {
        targetApi[methodName] = originalMethods[methodName];
      }
    }
  );
}

/**
 * 把 `App.useApp()` 返回的上下文实例桥接到 antd 静态 API。
 * @param {{ messageApi?: Record<string, Function>, modalApi?: Record<string, Function> }} appApis - `App.useApp()` 收敛后的实例集合。
 */
export function bindAntdStaticApis(appApis) {
  // `messageApi`：当前根 App 提供的消息实例，可能尚未就绪；仅存在的方法会覆盖静态入口。
  const messageApi = appApis?.messageApi;

  // `modalApi`：当前根 App 提供的弹窗实例；它的生命周期由根桥控制，不由页面模块另行持久化。
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

// ───── 模块结束：src/utils/antdStaticBridge.js ─────
