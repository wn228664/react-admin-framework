import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';
import 'dayjs/locale/zh-cn';
import { App as AntdApp, ConfigProvider } from 'antd';
import locale from 'antd/locale/zh_CN';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import AntdAppBridge from '@/components/AntdAppBridge';
import logger from '@/utils/logger';
import { getPageTitle, resolveMatchedPageTitle } from '@/utils/pageTitle';
import { APP_ANTD_COMPONENTS_TOKEN, APP_ANTD_THEME_TOKEN } from '@/styles/tokens';
import '@/styles/glass.less';

dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.locale('zh-cn');
NProgress.configure({ showSpinner: false });
export const dva = { config: { onError: (error) => logger.error(error) } };
export function onRouteChange({ clientRoutes, location }) {
  document.title = getPageTitle(resolveMatchedPageTitle(clientRoutes, location));
  NProgress.start();
  requestAnimationFrame(() => NProgress.done());
}
export function rootContainer(container) {
  return (
    <AppErrorBoundary>
      <ConfigProvider locale={locale} theme={{ token: APP_ANTD_THEME_TOKEN, components: APP_ANTD_COMPONENTS_TOKEN }}>
        <AntdApp>
          <AntdAppBridge />
          {container}
        </AntdApp>
      </ConfigProvider>
    </AppErrorBoundary>
  );
}
