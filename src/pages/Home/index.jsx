import { Typography, Button } from 'antd';
import { history } from 'umi';
import PageContainer from '@/components/PageContainer';
import ScrollPanel from '@/components/ScrollPanel';
export default function Home() {
  return (
    <PageContainer title="首页">
      <ScrollPanel>
        <Typography.Title level={2}>React Admin Framework</Typography.Title>
        <Typography.Paragraph>应用已就绪。可从菜单、路由和通用组件开始开发。</Typography.Paragraph>
        <Button type="primary" onClick={() => history.push('/components')}>
          查看通用组件
        </Button>
      </ScrollPanel>
    </PageContainer>
  );
}
