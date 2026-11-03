import { Button, Result } from 'antd';
import { history } from 'umi';
import PageContainer from '@/components/PageContainer';
import ScrollPanel from '@/components/ScrollPanel';
export default function NotFound() {
  return (
    <PageContainer>
      <ScrollPanel>
        <Result
          status="404"
          title="404"
          subTitle="页面不存在"
          extra={<Button onClick={() => history.replace('/')}>返回首页</Button>}
        />
      </ScrollPanel>
    </PageContainer>
  );
}
