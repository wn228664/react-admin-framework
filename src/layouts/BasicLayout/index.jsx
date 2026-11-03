import { Button, Grid, Layout, Space } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined } from '@ant-design/icons';
import { connect, useLocation } from 'umi';
import { useEffect } from 'react';
import AdminDrawer from '@/components/AdminDrawer';
import SidebarMenu from '@/components/SidebarMenu';
import Breadcrumb from '@/components/Breadcrumb';
import FullscreenToggle from '@/components/FullscreenToggle';
import GlobalSearch from '@/components/GlobalSearch';
import TagsView from '@/components/TagsView';
import RouteKeepAliveOutlet from '@/components/RouteKeepAliveOutlet';
import LayoutSettingsDrawer from '@/components/LayoutSettingsDrawer';
import './index.less';

function BasicLayout({ dispatch, app, menu, settings, tagsView }) {
  const screens = Grid.useBreakpoint();
  const location = useLocation();
  const mobile = !screens.md;
  const opened = app.sidebar.opened;
  useEffect(() => {
    if (mobile) dispatch({ type: 'app/closeSidebar' });
  }, [mobile, location.pathname, dispatch]);
  const navigation = (
    <>
      {settings.sidebarLogo && <div className="framework-logo">Framework</div>}
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
          onClose={() => dispatch({ type: 'app/closeSidebar' })}
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
                onClick={() => dispatch({ type: 'app/toggleSidebar' })}
              />
              <Breadcrumb routes={menu.routes} />
            </Space>
            <Space>
              <GlobalSearch routes={menu.routes} />
              <FullscreenToggle />
              <Button
                aria-label="布局设置"
                icon={<SettingOutlined />}
                onClick={() =>
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
export default connect(({ app, menu, settings, tagsView }) => ({ app, menu, settings, tagsView }))(BasicLayout);
