/**
 * 模块职责：把纯任务门闩接到 React 浮层生命周期，统一 pending、错误提示与取消行为。
 * open 关闭或组件卸载会撤销旧周期；成功回调是否关闭窗口由受控父组件决定。
 * onOk 里的外部状态写入仍须在 await 后检查 signal，Hook 只能约束自身 UI。
 */
// 引用保存同步锁与 mounted 身份，effect 绑定清理，state 只负责当前 pending 显示。
/**
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 * `useRef`：保存跨渲染 owner、DOM 或任务身份；写 current 不会触发重渲染，清理由配对生命周期负责。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import { useEffect, useRef, useState } from 'react';
/** `getMsg`：只选择非空公开文本，异常 message 对象回退默认文案，不能直接作为 React 子节点。 */
import { getMsg } from '@/utils/robust';

// 读取根 Antd App 的主题化 message；组件必须处在 App 上下文内。
/**
 * `App`：从当前根上下文取得主题化反馈能力，不把 message 当作任务成功判断。
 */
import { App } from 'antd';
// 纯门闩保证连点互斥与关闭重开隔离，React setState 的异步批处理不能代替它。
/**
 * `createTaskGate`：创建一个不共享全局状态的任务门闩，owner 卸载时必须 cancel。
 */
import { createTaskGate } from './taskGate';

/**
 * 为一个受控 open 周期创建确认动作。
 * @param {boolean} open 当前可见性，false 时新确认不执行。
 * @param {Function} [onOk] 接收 event、{signal}，返回普通值或 Promise。
 * @param {Function} [onError] 当前周期失败时调用；省略时显示公开 message。
 * @returns {Object} pending、confirm(event)、cancel()，成功不自动关闭父级。
 */
export default function useOverlayAction(open, onOk, onError) {
  // `message`：根 App 的主题化反馈实例；默认只展示当前任务的公开错误文案，不属于请求状态。
  const { message } = App.useApp();
  // 门闩跨 render 保持同一实例；mounted 只允许存活组件更新 pending。
  const gate = useRef(createTaskGate());
  // `mounted`：当前 Hook owner 的存活 ref，初始 false；effect 挂载后置真、清理先置假以隔离迟到结果。
  const mounted = useRef(false);
  // pending 是展示状态，实际同步占锁由 gate.begin 完成。
  // `setPending`：发布当前 owner 的展示忙碌态；不能代替 gate 的同步锁，旧周期结束不得清除新周期状态。
  const [pending, setPending] = useState(false);
  useEffect(
    /**
     * 标记当前 Hook owner 存活并捕获门闩，返回卸载撤销函数；任务忙碌状态仍由同步 gate 决定。
     * @returns {Function} 清理当前 owner。
     */ () => {
      mounted.current = true;
      // `owner`：effect 挂载时捕获的门闩实例；清理时撤销该实例，即使后续 ref 变化也不取消其它 owner。
      const owner = gate.current;
      return (
        /**
         * 先使当前 owner 不再接收结果，再撤销其任务门闩；迟到的 onOk 不得更新新周期 UI。
         * @returns {void}
         */ () => {
          mounted.current = false;
          owner.cancel();
        }
      );
    },
    []
  );
  useEffect(
    /**
     * open 关闭时取消当前周期并清除展示忙碌态；重新打开不会恢复旧任务的结果消费权。
     * @returns {void}
     */ () => {
      if (!open) {
        gate.current.cancel();
        setPending(false);
      }
    },
    [open]
  );
  /**
   * 显式取消时立即解开当前 UI 互斥；旧任务随后完成也不能清除新周期状态。
   * @returns {void}
   */
  const cancel = () => {
    gate.current.cancel();
    if (mounted.current) setPending(false);
  };
  /**
   * 接收 Antd 确认事件，在同步占锁后等待 onOk，当前错误才交给提示层。
   * @param {Object} event 原确认事件；signal 作为第二个参数交给 onOk。
   * @returns {Promise<void>} 本 Hook 消费当前错误并保留浮层；onError 自身抛错仍向外传播。
   */
  const confirm = async (event) => {
    if (!open) return;
    // `task`：本次确认取得的周期句柄，含 signal/isCurrent/finish；重复确认取不到句柄便立即退出。
    const task = gate.current.begin();
    if (!task) return;
    setPending(true);
    try {
      // 调用方如需更新外部状态，应在 await 后检查 signal.aborted。
      await onOk?.(event, { signal: task.signal });
    } catch (/* `error`：onOk 的拒绝结果；仅存活且仍为当前周期时展示或交给 onError，旧结果不回写 UI。 */ error) {
      if (mounted.current && task.isCurrent()) {
        if (onError) onError(error);
        else message.error(getMsg(error, '操作失败，请重试'));
      }
    } finally {
      if (mounted.current && task.isCurrent()) setPending(false);
      task.finish();
    }
  };
  return { pending, confirm, cancel };
}

// ───── 模块结束：src/components/AsyncOverlay/useOverlayAction.js ─────
