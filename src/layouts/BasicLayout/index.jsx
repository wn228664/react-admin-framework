/**
 * 模块职责：组合固定顶栏、页签、菜单和页面出口，为后台提供唯一的视口高度 owner。
 * 窄屏菜单进入受控抽屉；页面、菜单、表格及浮层各自管理内容滚动，文档根不滚动。
 * 布局从 Dva 读取快照，不创建第二套菜单/权限/缓存状态，也不在初始化时请求业务接口。
 */
// Grid 只决定布局断点，Layout 分配视口剩余空间，按钮提供显式导航和设置入口。
/**
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 * `Grid`：读取真实布局断点，窄屏/桌面仅改变布局，不代表权限或平台能力。
 * `Layout`：分配视口内的 Sider/Header/Content 高度，文档根保持固定。
 * `Space`：组织当前节点间距，不能接管宿主子节点的点击或提交语义。
 */
import { Button, Grid, Layout, Space } from 'antd';
// 图标只表达侧栏开关与设置操作，不承担权限或页面身份判断。
/**
 * `MenuFoldOutlined`：侧栏折叠状态的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `MenuUnfoldOutlined`：侧栏展开状态的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `SettingOutlined`：布局设置入口的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import { MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined } from '@ant-design/icons';
// Dva 提供各模型的唯一快照，location 变化驱动窄屏导航后的收起动作。
/**
 * `connect`：订阅唯一 Dva 模型并注入 dispatch，组件不另存模型字段的镜像。
 * `useLocation`：读取本次已确认导航的位置快照，pathname/search/hash 的具体消费由当前组件决定。
 */
import { connect, useLocation } from 'umi';
// effect 将窄屏导航事件交给模型，避免 render 中产生状态写入。
/**
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 */
import { useEffect } from 'react';
// 移动侧栏复用内部滚动和受控关闭的抽屉外壳。
/**
 * `AdminDrawer`：提供受控抽屉、确认门闩和正文滚动，成功关闭仍由父级更新 open。
 */
import AdminDrawer from '@/components/AdminDrawer';
// 侧栏组件消费同一菜单路由树并自行处理内容显露。
/**
 * `SidebarMenu`：消费当前菜单目录并在自己的滚动区显露选中项，不维护业务权限。
 */
import SidebarMenu from '@/components/SidebarMenu';
// 面包屑只展示当前匹配链，不额外持有导航数据。
/**
 * `Breadcrumb`：从真实路径和元数据派生只读层级标题，动态菜单未命中时静态兜底。
 */
import Breadcrumb from '@/components/Breadcrumb';
// 全屏切换以浏览器真实事件为状态来源。
/**
 * `FullscreenToggle`：由真实全屏事件驱动按钮状态，浏览器拒绝时提供公开反馈。
 */
import FullscreenToggle from '@/components/FullscreenToggle';
// 全局菜单搜索只使用当前路由目录，不请求业务数据。
/**
 * `GlobalSearch`：搜索已提供的本地菜单目录，选择结果后执行显式站内导航。
 */
import GlobalSearch from '@/components/GlobalSearch';
// 访问标签消费 tagsView model，并发出关闭或刷新请求。
/**
 * `TagsView`：展示访问标签并把关闭/刷新交给唯一模型，固定项保留恢复入口。
 */
import TagsView from '@/components/TagsView';
// 缓存出口独立保存各页面的路由上下文，父布局不复制页面实例。
/**
 * `RouteKeepAliveOutlet`：保存允许缓存的页面实例与首次路由快照，移除资格后释放非活动实例。
 */
import RouteKeepAliveOutlet from '@/components/RouteKeepAliveOutlet';
// 布局偏好通过固定 action 更新 settings，不修改权限和接口。
/**
 * `LayoutSettingsDrawer`：只更新固定声明的布局偏好，不改变权限、接口和路由目录。
 */
import LayoutSettingsDrawer from '@/components/LayoutSettingsDrawer';
// 外壳、主区和正文建立可收缩高度链，页面根禁止滚动。
import './index.less';

/**
 * 将应用模型组合为固定后台外壳。
 * @param {Object} props dispatch 为 Dva 发布入口；app/menu/settings/tagsView 为对应模型当前快照。
 * @returns {React.ReactElement} 有界页面出口；长内容必须由子组件提供滚动区。
 */
function BasicLayout({
  /* `dispatch`：父级 connect 注入的 Dva 发布入口，用于布局偏好和侧栏动作，不处理业务数据。 */ dispatch,
  /* `app`：应用布局模型，当前消费 sidebar.opened；Cookie 失败时仍可用内存状态。 */ app,
  /* `menu`：当前有效的菜单路由树模型，供侧栏/面包屑/搜索共享。 */ menu,
  /* `settings`：布局显示偏好快照，决定 Logo、页签栏和设置抽屉显示。 */ settings,
  /* `tagsView`：已访问页签及缓存目录模型，缓存出口读取 cachedViews 统一失效。 */ tagsView,
}) {
  // 只根据实际布局断点判断是否使用移动菜单，不把设备模式当权限或平台能力。
  const screens = Grid.useBreakpoint();
  // `location`：当前 Umi 路由位置，pathname 变化后在窄屏收起菜单，不读取业务 query。
  const location = useLocation();
  // `mobile`：当前布局断点尚未达到 md 的布尔值；仅选择 Drawer/Sider 展示方式，不作为平台能力证明。
  const mobile = !screens.md;
  // `opened`：app.sidebar.opened 的唯一可见性快照；桌面折叠和窄屏抽屉复用它。
  const opened = app.sidebar.opened;
  useEffect(() => {
    if (mobile) dispatch({ type: 'app/closeSidebar' });
  }, [mobile, location.pathname, dispatch]);
  // 桌面和抽屉复用同一导航内容，避免两套路由树在权限变化时漂移。
  const navigation = (
    <>
      {settings.sidebarLogo && (
        <div className="framework-logo" title="Framework" aria-label="Framework">
          {mobile || opened ? 'Framework' : 'F'}
        </div>
      )}
      <div className="framework-navigation">
        <SidebarMenu routes={menu.routes} collapsed={!mobile && !opened} />
      </div>
    </>
  );
  return (
    <Layout className="framework-layout">
      {mobile ? (
        <AdminDrawer
          footer={null}
          title="导航"
          placement="left"
          width={240}
          open={opened}
          onClose={
            /**
             * 关闭窄屏导航抽屉，只更新唯一 sidebar 模型，不变更当前路由和菜单目录。
             * @returns {*} dispatch 返回值由 Dva 管理。
             */ () => dispatch({ type: 'app/closeSidebar' })
          }
        >
          {navigation}
        </AdminDrawer>
      ) : (
        <Layout.Sider width={224} theme="light" collapsed={!opened}>
          {navigation}
        </Layout.Sider>
      )}
      <Layout className="framework-main">
        <div className="framework-header">
          <Layout.Header>
            <Space>
              <Button
                aria-label="切换导航"
                type="text"
                icon={opened ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                onClick={
                  /**
                   * 在桌面折叠和窄屏抽屉之间复用 sidebar.toggle 模型动作，不另建一份 opened 状态。
                   * @returns {*} dispatch 结果。
                   */ () => dispatch({ type: 'app/toggleSidebar' })
                }
              />
              <Breadcrumb routes={menu.routes} />
            </Space>
            <Space>
              <GlobalSearch routes={menu.routes} />
              <FullscreenToggle />
              <Button
                aria-label="布局设置"
                icon={<SettingOutlined />}
                onClick={
                  /**
                   * 显式打开布局设置抽屉，配置仍由 settings 模型持有并统一应用到布局。
                   * @returns {*} dispatch 结果。
                   */ () =>
                    dispatch({
                      type: 'settings/changeSetting',
                      payload: { key: 'showSettings', value: true },
                    })
                }
              />
            </Space>
          </Layout.Header>
          {settings.tagsView && <TagsView />}
        </div>
        <Layout.Content className="framework-content">
          <RouteKeepAliveOutlet cachedViews={tagsView.cachedViews} />
        </Layout.Content>
      </Layout>
      <LayoutSettingsDrawer settings={settings} dispatch={dispatch} />
    </Layout>
  );
}
export default connect(
  ({
    /* `app`：connect 从全局根状态选出的 app 模型，不复制 sidebar 字段。 */ app,
    /* `menu`：connect 从全局根状态选出的 menu 模型，保证多个导航组件使用同一目录。 */ menu,
    /* `settings`：connect 选出的 settings 模型，开关变化后重新渲染布局。 */ settings,
    /* `tagsView`：connect 选出的 tagsView 模型，标签关闭/刷新后同步通知缓存出口。 */ tagsView,
  }) => ({ app, menu, settings, tagsView })
)(BasicLayout);

// ───── 模块结束：src/layouts/BasicLayout/index.jsx ─────
