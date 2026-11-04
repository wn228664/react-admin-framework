/**
 * 模块职责：约束菜单搜索的可见性、相对路由拼接和键盘输入边界。
 * 使用纯路由/事件替身，不访问浏览器历史或网络，防止将框架导航误绑定业务入口。
 */
/**
 * `flattenGlobalSearchRoutes`：扁平化路由树，提取所有带 `meta.title` 与 `path` 的可搜索菜单项。
 * `isGlobalSearchShortcut`：判断是否允许由菜单搜索接管 Ctrl/Cmd+K。
 * `resolveGlobalSearchKeyAction`：将搜索输入框的有效 Enter/Escape 投影为界面动作，供组件与回归测试共用。
 */
import { flattenGlobalSearchRoutes, isGlobalSearchShortcut, resolveGlobalSearchKeyAction } from '../utils';

/**
 * 三级相对菜单保持完整祖先路径，hidden 节点及其子树不能进入结果。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('nested relative menu paths retain all ancestor segments and hidden trees are excluded', () => {
  // routes：包含三级相对路径和隐藏子树的最小声明；预期仅生成可见入口。
  const routes = [
    {
      path: '/tools',
      meta: { title: '工具' },
      routes: [{ path: 'media', meta: { title: '媒体' }, routes: [{ path: 'image', meta: { title: '图片' } }] }],
    },
    { path: '/hidden', hidden: true, meta: { title: '隐藏' }, routes: [{ path: 'detail', meta: { title: '详情' } }] },
  ];
  expect(
    flattenGlobalSearchRoutes(routes).map((/* entry：当前生成的搜索项，只检查其最终站内路径。 */ entry) => entry.path)
  ).toEqual(['/tools', '/tools/media', '/tools/media/image']);
});

/**
 * Ctrl/Cmd+K 兼容大写键，但重复、组合输入、已消费事件和输入控件保留自身操作。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('the global shortcut ignores held keys, IME confirmation, handled events and editable controls', () => {
  expect(isGlobalSearchShortcut({ ctrlKey: true, key: 'K' })).toBe(true);
  expect(isGlobalSearchShortcut({ metaKey: true, key: 'k' })).toBe(true);
  expect(isGlobalSearchShortcut({ ctrlKey: true, key: 'k', repeat: true })).toBe(false);
  expect(isGlobalSearchShortcut({ ctrlKey: true, key: 'k', isComposing: true })).toBe(false);
  expect(isGlobalSearchShortcut({ ctrlKey: true, key: 'k', nativeEvent: { isComposing: true } })).toBe(false);
  expect(isGlobalSearchShortcut({ ctrlKey: true, key: 'k', defaultPrevented: true })).toBe(false);
  expect(isGlobalSearchShortcut({ ctrlKey: true, key: 'k', target: { tagName: 'INPUT' } })).toBe(false);
  expect(isGlobalSearchShortcut({ ctrlKey: true, key: 'k', target: { isContentEditable: true } })).toBe(false);
});

/** 输入框的 Enter/Escape 只在真正选择/退出时消费，输入法确认不得导航或关闭搜索。 */
/**
 * 输入框 Enter/Escape 仅在有效按键时选择/关闭，输入法确认不能误导航或丢失搜索上下文。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('search input actions preserve composing and already-consumed keyboard events', () => {
  expect(resolveGlobalSearchKeyAction({ key: 'Enter' })).toBe('select');
  expect(resolveGlobalSearchKeyAction({ key: 'Escape' })).toBe('close');
  expect(resolveGlobalSearchKeyAction({ key: 'Enter', isComposing: true })).toBeNull();
  expect(resolveGlobalSearchKeyAction({ key: 'Escape', nativeEvent: { isComposing: true } })).toBeNull();
  expect(resolveGlobalSearchKeyAction({ key: 'Enter', nativeEvent: { keyCode: 229 } })).toBeNull();
  expect(resolveGlobalSearchKeyAction({ key: 'Enter', repeat: true })).toBeNull();
  expect(resolveGlobalSearchKeyAction({ key: 'Enter', defaultPrevented: true })).toBeNull();
});

// ───── 模块结束：src/components/GlobalSearch/__tests__/navigation.test.js ─────
