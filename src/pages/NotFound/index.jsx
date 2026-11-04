/**
 * 模块职责：为未匹配路由提供可恢复的 404 页面，不推断权限或接口是否存在。
 * 返回动作 replace 根路径，再由静态路由重定向到首页，避免历史栈继续保留错误入口。
 */
// Result/按钮呈现路由缺失与恢复操作，不吞掉组件渲染异常。
/**
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 * `Result`：呈现错误/空态与恢复操作，不能用它吞掉原请求或渲染异常。
 */
import { Button, Result } from 'antd';
// history.replace 替换当前无效路径，不形成连续 404 后退循环。
/**
 * `history`：通过站内 push/replace 执行显式导航；本模块决定目标，不能视为 URL 安全校验器。
 */
import { history } from 'umi';
// 页面骨架保留应用外壳的固定高度。
/**
 * `PageContainer`：分配固定标题与剩余内容高度，长内容滚动由子组件承担。
 */
import PageContainer from '@/components/PageContainer';
// 404 内容使用组件内滚动，极短窗口仍可到达返回操作。
/**
 * `ScrollPanel`：为长内容提供头部固定、Card body 内部滚动的有界容器。
 */
import ScrollPanel from '@/components/ScrollPanel';
/**
 * 渲染静态路由兜底；网络失败和权限不足应由各自服务页面表达。
 * @returns {React.ReactElement} 含返回首页入口的 404 内容。
 */
export default function NotFound() {
  return (
    <PageContainer>
      <ScrollPanel>
        <Result
          status="404"
          title="404"
          subTitle="页面不存在"
          extra={
            <Button
              onClick={
                /**
                 * 使用 replace 返回框架首页，避免浏览器后退再次落入当前无效路由。
                 * @returns {void}
                 */ () => history.replace('/')
              }
            >
              返回首页
            </Button>
          }
        />
      </ScrollPanel>
    </PageContainer>
  );
}

// ───── 模块结束：src/pages/NotFound/index.jsx ─────
