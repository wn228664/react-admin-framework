/**
 * 模块职责：展示独立框架已启动的中性首页，并提供通用组件验证入口。
 * 没有账号、业务数据或默认后端请求；实际项目可整体替换页面内容，保留页面与组件滚动边界。
 */
// Typography 提供首页说明，Button 只执行用户显式导航。
/**
 * `Typography`：呈现中性首页的标题与说明段落，与组件导航按钮共享同一正文滚动容器。
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 */
import { Typography, Button } from 'antd';
// history.push 进入已登记的组件页，不打开任意外部地址。
/**
 * `history`：通过站内 push/replace 执行显式导航；本模块决定目标，不能视为 URL 安全校验器。
 */
import { history } from 'umi';
// 标题与正文高度由页面骨架分配。
/**
 * `PageContainer`：分配固定标题与剩余内容高度，长内容滚动由子组件承担。
 */
import PageContainer from '@/components/PageContainer';
// 说明内容在 Card body 内滚动，文档根保持固定。
/**
 * `ScrollPanel`：为长内容提供头部固定、Card body 内部滚动的有界容器。
 */
import ScrollPanel from '@/components/ScrollPanel';
/**
 * 渲染不依赖后端的框架欢迎页。
 * @returns {React.ReactElement} 可删除的本地首页，不产生存储或请求副作用。
 */
export default function Home() {
  return (
    <PageContainer title="首页">
      <ScrollPanel>
        <Typography.Title level={2}>React Admin Framework</Typography.Title>
        <Typography.Paragraph>应用已就绪。可从菜单、路由和通用组件开始开发。</Typography.Paragraph>
        <Button
          type="primary"
          onClick={
            /**
             * 通过框架路由进入通用组件验证页，路径为固定中性入口，不调用业务接口。
             * @returns {void}
             */ () => history.push('/components')
          }
        >
          查看通用组件
        </Button>
      </ScrollPanel>
    </PageContainer>
  );
}

// ───── 模块结束：src/pages/Home/index.jsx ─────
