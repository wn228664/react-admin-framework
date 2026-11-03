import { createTaskGate } from '../taskGate';

test('one action owns the open cycle, including synchronous duplicate clicks', () => {
  const gate = createTaskGate();
  const action = gate.begin();
  expect(action.signal.aborted).toBe(false);
  expect(gate.begin()).toBeNull();
  action.finish();
  expect(gate.begin()).not.toBeNull();
});
test('close aborts pending work and makes a late result stale', () => {
  const gate = createTaskGate();
  const old = gate.begin();
  gate.cancel();
  const next = gate.begin();
  expect(old.signal.aborted).toBe(true);
  expect(old.isCurrent()).toBe(false);
  old.finish();
  expect(next.isCurrent()).toBe(true);
  expect(gate.begin()).toBeNull();
});
test('failure cleanup releases the action for retry', async () => {
  const gate = createTaskGate();
  const action = gate.begin();
  try {
    await Promise.reject(new Error('failed'));
  } catch {
    /* Caller shows the failure. */
  } finally {
    action.finish();
  }
  expect(gate.begin()).not.toBeNull();
});
