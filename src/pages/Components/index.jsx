import { useCallback, useEffect, useRef, useState } from 'react';
import { App, Button, Checkbox, Input, Segmented, Space } from 'antd';
import PageContainer from '@/components/PageContainer';
import ScrollPanel from '@/components/ScrollPanel';
import AdminModal from '@/components/AdminModal';
import AdminDrawer from '@/components/AdminDrawer';
import ProTable from '@/components/ProTable';
import IconSelect from '@/components/IconSelect';
import UploadFile from '@/components/UploadFile';
import RichTextEditor from '@/components/RichTextEditor';
import './index.less';

const rows = Array.from({ length: 120 }, (_, index) => ({
  id: index + 1,
  name: `示例条目 ${index + 1}`,
  description: '用于验证通用表格的分页、筛选和内部滚动。',
}));
const columns = [
  { title: '名称', dataIndex: 'name', width: 240, sorter: true },
  { title: '说明', dataIndex: 'description', width: 700 },
];
const fields = [
  { name: 'keyword', label: '关键词', type: 'input', span: 6 },
  ...Array.from({ length: 10 }, (_, i) => ({ name: `field${i}`, label: `条件 ${i + 1}`, type: 'input', span: 6 })),
];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const longContent = Array.from({ length: 60 }, (_, i) => (
  <p key={i}>通用内容 {i + 1}：用于验证正文滚动时，标题、关闭入口和底部操作区保持可见。</p>
));

export default function Components() {
  const { message } = App.useApp();
  const [section, setSection] = useState('表格');
  const [text, setText] = useState('');
  const [html, setHtml] = useState('');
  const [icon, setIcon] = useState('');
  const [modal, setModal] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [failSubmit, setFailSubmit] = useState(false);
  const [failRequest, setFailRequest] = useState(false);
  const [failUpload, setFailUpload] = useState(false);
  const [calls, setCalls] = useState(0);
  const [submits, setSubmits] = useState(0);
  const [files, setFiles] = useState([]);
  const urls = useRef(new Set());
  const uploadRef = useRef(null);
  useEffect(() => {
    const entries = urls.current;
    return () => entries.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const request = useCallback(
    async ({ current, pageSize, keyword = '' }) => {
      setCalls((value) => value + 1);
      // 不同延迟用于验证旧搜索晚返回，演示数据完全本地。
      await wait(keyword === 'slow' ? 700 : 80);
      if (failRequest) throw new Error('示例加载失败，可关闭“请求失败”后重试');
      const matches = rows.filter((row) => row.name.includes(keyword));
      return { list: matches.slice((current - 1) * pageSize, current * pageSize), total: matches.length };
    },
    [failRequest]
  );
  const submit = async (_event, { signal }) => {
    setSubmits((value) => value + 1);
    await wait(500);
    if (signal.aborted) return;
    if (failSubmit) throw new Error('示例提交失败，输入已保留');
    setModal('');
    setDrawer(false);
  };
  const upload = ({ file, onSuccess, onError }) => {
    const timer = setTimeout(() => {
      if (failUpload) {
        onError(new Error('示例上传失败'));
        return;
      }
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      onSuccess({ url });
    }, 400);
    return { abort: () => clearTimeout(timer) };
  };
  return (
    <PageContainer
      title="通用组件"
      extra={
        <Segmented
          aria-label="组件分类"
          options={['表格', '表单与弹层', '上传与编辑']}
          value={section}
          onChange={setSection}
        />
      }
    >
      {section === '表格' && (
        <ProTable
          title={`表格（请求 ${calls} 次）`}
          columns={columns}
          request={request}
          searchFields={fields}
          refreshDeps={[failRequest]}
          toolBarRender={() => (
            <Checkbox checked={failRequest} onChange={(e) => setFailRequest(e.target.checked)}>
              请求失败
            </Checkbox>
          )}
        />
      )}
      {section === '表单与弹层' && (
        <ScrollPanel title={`表单与反馈（确认 ${submits} 次）`}>
          <Space direction="vertical" size="middle" className="component-form">
            <Input
              aria-label="缓存输入"
              placeholder="切换页签后保留此输入"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <IconSelect value={icon} onChange={setIcon} />
            <Checkbox checked={failSubmit} onChange={(e) => setFailSubmit(e.target.checked)}>
              提交失败
            </Checkbox>
            <div className="starter-actions">
              <Button onClick={() => message.success('提示组件正常')}>显示提示</Button>
              <Button onClick={() => setModal('long')}>打开长弹窗</Button>
              <Button onClick={() => setModal('loading')}>加载弹窗</Button>
              <Button onClick={() => setModal('noFooter')}>无底部弹窗</Button>
              <Button onClick={() => setModal('table')}>弹窗内表格</Button>
              <Button onClick={() => setDrawer(true)}>打开长抽屉</Button>
            </div>
            {longContent}
          </Space>
        </ScrollPanel>
      )}
      {section === '上传与编辑' && (
        <ScrollPanel title="上传与编辑">
          <Checkbox checked={failUpload} onChange={(e) => setFailUpload(e.target.checked)}>
            上传失败
          </Checkbox>
          <Button onClick={() => uploadRef.current?.clearFiles()}>清空文件</Button>
          <UploadFile
            ref={uploadRef}
            value={files}
            onChange={setFiles}
            maxCount={3}
            multiple
            customRequest={upload}
            dataPath="url"
            maxSize={2}
            tips="本地临时文件用于验证上传、移除和预览；不请求服务器。"
          />
          <RichTextEditor value={html} onChange={setHtml} />
        </ScrollPanel>
      )}
      <AdminModal
        title="通用弹窗"
        open={Boolean(modal)}
        loading={modal === 'loading'}
        onCancel={() => setModal('')}
        onOk={submit}
        {...(modal === 'noFooter' ? { footer: null } : {})}
      >
        {modal === 'table' ? (
          <div className="overlay-table">
            <ProTable columns={columns} request={request} searchFields={[]} />
          </div>
        ) : (
          longContent
        )}
      </AdminModal>
      <AdminDrawer title="通用抽屉" open={drawer} onClose={() => setDrawer(false)} onOk={submit} width={560}>
        {longContent}
      </AdminDrawer>
    </PageContainer>
  );
}
