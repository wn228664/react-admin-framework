import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import { createTaskGate } from './taskGate';

export default function useOverlayAction(open, onOk, onError) {
  const { message } = App.useApp();
  const gate = useRef(createTaskGate());
  const mounted = useRef(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    mounted.current = true;
    const owner = gate.current;
    return () => {
      mounted.current = false;
      owner.cancel();
    };
  }, []);
  useEffect(() => {
    if (!open) {
      gate.current.cancel();
      setPending(false);
    }
  }, [open]);
  const cancel = () => {
    gate.current.cancel();
    if (mounted.current) setPending(false);
  };
  const confirm = async (event) => {
    if (!open) return;
    const task = gate.current.begin();
    if (!task) return;
    setPending(true);
    try {
      // 调用方如需更新外部状态，应在 await 后检查 signal.aborted。
      await onOk?.(event, { signal: task.signal });
    } catch (error) {
      if (mounted.current && task.isCurrent()) {
        if (onError) onError(error);
        else message.error(error?.message || '操作失败，请重试');
      }
    } finally {
      if (mounted.current && task.isCurrent()) setPending(false);
      task.finish();
    }
  };
  return { pending, confirm, cancel };
}
