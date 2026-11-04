/**
 * `buildTagsViewDisplayTitle`：从当前路由元数据选择标签文案，不解释任何特定查询字段。
 */
/**
 * 模块职责：防止标签和面包屑根据特定业务 query 硬编码替换路由标题。
 * 原问题字段只作为回归输入，标题必须来自当前 route.meta；不调用任何业务 API 或保存数据。
 */
import { buildTagsViewDisplayTitle } from '@/components/TagsView/utils';
/**
 * `buildBreadcrumbEntries`：按实际 pathname 生成标题链，动态菜单未命中时尝试静态路由。
 */
import { buildBreadcrumbEntries } from '@/components/Breadcrumb/utils';

/**
 * 原问题 query 只作回归输入，标签和面包屑标题必须保留调用方路由元数据。
 * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
 */
test('query fields never replace titles through hardcoded feature-specific rules', () => {
  // `pathname`：故意保留的原问题形状路径，帮助证明规则对路径/业务 query 都保持中性。
  const pathname = '/system/dict/data/1';
  // `route`：调用方显式声明标题的动态路由夹具，meta.title 是唯一应展示的业务外部输入。
  const route = { path: '/system/dict/data/:id', name: 'SystemDictData', meta: { title: '调用方配置标题' } };
  expect(buildTagsViewDisplayTitle({ pathname, search: '?dictType=fixture', currentRoute: route })).toBe(
    '调用方配置标题'
  );
  // `entries`：真实面包屑 helper 派生的链，末项标题应保持路由声明，不受 query 特判覆盖。
  const entries = buildBreadcrumbEntries({ pathname, search: '?dictType=fixture', routes: [route] });
  expect(entries.at(-1).title).toBe('调用方配置标题');
});

// ───── 模块结束：src/utils/__tests__/navigationContract.test.js ─────
