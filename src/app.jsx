/**
 * 模块职责：装配全局日期语言、路由进度、错误边界和 Ant Design 上下文，供 Umi 启动入口调用。
 * 所有页面共享这一层主题与提示实例；路由回调只更新文档标题，不请求接口或判断业务成功。
 * 初始化或渲染失败由根错误边界展示恢复入口，异步请求错误仍由各自调用方消费。
 */
// Dayjs 实例供日期控件复用同一套中文日历行为。
/**
 * `dayjs`：设置全局中文日期展示及插件基础，不修改服务端时间契约。
 */
import dayjs from 'dayjs';
// 日期控件需要 localeData 才能读取本地化日历名称。
/**
 * `localeData`：为 Antd 日期控件提供 locale 数据访问能力，需在渲染前扩展 dayjs。
 */
import localeData from 'dayjs/plugin/localeData';
// weekday 补齐日期控件按本地周起点计算星期的能力。
/**
 * `weekday`：为日期控件提供按 locale 计算周内日期的能力，不等于指定服务端时区。
 */
import weekday from 'dayjs/plugin/weekday';
// 注册中文日期文本；此副作用在根入口执行一次。
import 'dayjs/locale/zh-cn';
// ConfigProvider 传递主题与语言，AntdApp 为消息和弹窗提供上下文实例。
/**
 * `AntdApp`：提供根 message/modal 等主题化实例，静态桥必须在其子树绑定。
 * `ConfigProvider`：为整棵 UI 提供中文 locale 和语义主题，不负责业务认证或接口结果判断。
 */
import { App as AntdApp, ConfigProvider } from 'antd';
// 中文组件文案在根 Provider 注入，页面不重复配置。
/**
 * `locale`：为根 ConfigProvider 提供中文日期、分页和表单等内建控件文案。
 */
import locale from 'antd/locale/zh_CN';
// 路由切换只用 NProgress 呈现短暂过渡，不代表接口已经成功。
/**
 * `NProgress`：在路由切换开始/结束更新顶部进度，不代表接口或异步业务完成。
 */
import NProgress from 'nprogress';
// 进度条外观跟随 NProgress 的公开样式。
import 'nprogress/nprogress.css';
// 捕获子树渲染异常，保留刷新与返回首页的恢复入口。
/**
 * `AppErrorBoundary`：隔离根子树渲染失败并提供恢复入口，不能捕获普通异步回调拒绝。
 */
import AppErrorBoundary from '@/components/AppErrorBoundary';
// 在子页面 effect 前绑定带主题的静态消息/弹窗接口。
/**
 * `AntdAppBridge`：绑定根 App 的主题化静态提示能力，并在卸载时恢复原函数。
 */
import AntdAppBridge from '@/components/AntdAppBridge';
// Dva 的未处理错误交给统一日志入口，由服务接入方决定脱敏内容。
/**
 * `logger`：提供统一诊断入口；warn/error 在生产仍可能输出，调用前必须移除秘密和原始响应。
 */
import logger from '@/utils/logger';
// 标题解析沿实际路由匹配链读取 meta.title，再附加应用名。
/**
 * `getPageTitle`：按“页面标题 - 应用标题”的口径生成最终文档标题。
 * `resolveMatchedPageTitle`：根据当前路径从路由树中解析匹配到的叶子页面标题。
 */
import { getPageTitle, resolveMatchedPageTitle } from '@/utils/pageTitle';
// 主题 token 是页面与 Antd 控件共享的设计参数。
/**
 * `APP_ANTD_COMPONENTS_TOKEN`：Antd 组件局部外观覆盖，不替代实际滚动和尺寸约束。
 * `APP_ANTD_THEME_TOKEN`：根 ConfigProvider 主题映射，影响全局基础色和圆角。
 */
import { APP_ANTD_COMPONENTS_TOKEN, APP_ANTD_THEME_TOKEN } from '@/styles/tokens';
// 统一材质层由根入口先建立，懒加载路由复用同一优先级，避免页面切换时外观漂移。
import '@/styles/glass.less';

dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.locale('zh-cn');
NProgress.configure({ showSpinner: false });
// Dva 将 effect 中的未捕获异常交给日志；它不会把失败转换为成功返回。
// `dva`：Umi/Dva 运行配置，onError 仅记录公开字符串类型/代码；它是配置声明而非第二个全局模型实例。
export const dva = {
  config: {
    onError: (
      /* `error`：Dva effect 未处理的失败对象；当前回调仅投影字符串 name/code，不记录 message、配置或响应体。 */ error
    ) =>
      logger.error('模型执行失败', {
        name: typeof error?.name === 'string' ? error.name : 'Error',
        code: typeof error?.code === 'string' ? error.code : undefined,
      }),
  },
};
/**
 * Umi 在 location 变化后调用；clientRoutes 为运行时路由树，location 为当前导航快照。
 * 更新 document.title 并在下一帧结束进度条；不等待页面请求，不改变路由历史。
 * @param {Object} context 包含 clientRoutes、location，标题缺失时沿用框架默认名称。
 * @returns {void}
 */
export function onRouteChange({
  /* `clientRoutes`：Umi 提供的本次客户端路由树，标题沿实际匹配链解析，不从业务 query 推导。 */ clientRoutes,
  /* `location`：本次已确认导航的位置快照；只读取路径生成文档标题，不持久化查询或改变历史。 */ location,
}) {
  document.title = getPageTitle(resolveMatchedPageTitle(clientRoutes, location));
  NProgress.start();
  requestAnimationFrame(
    /**
     * 在下一绘制帧结束导航进度条，避免路由提交前提前隐藏反馈；不决定页面请求是否成功。
     * @returns {void}
     */ () => NProgress.done()
  );
}
/**
 * 为 Umi 生成的根节点提供错误恢复、中文主题和 Antd App 上下文。
 * @param {React.ReactNode} container 框架生成的路由和模型子树，不在这里复制状态。
 * @returns {React.ReactElement} 所有页面共用的上下文边界。
 */
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

// ───── 模块结束：src/app.jsx ─────
