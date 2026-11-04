/**
 * 模块职责：提供可删除的本地通用组件验证页，覆盖表格、表单/弹层与上传/编辑。
 * 数据、延迟和失败开关都只在本页内存中；上传使用临时 Blob URL，不发送业务请求或保存账号信息。
 * 组件卸载时回收临时资源，验证页不应被当作新业务服务的默认成功实现。
 */
// Hook 管理本地验证草稿、失败开关、计数与临时资源 owner，切页缓存不等于卸载。
/**
 * `useCallback`：按依赖保持回调引用供消费者使用；回调中的当前值仍遵循 React 闭包语义。
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 * `useRef`：保存跨渲染 owner、DOM 或任务身份；写 current 不会触发重渲染，清理由配对生命周期负责。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
// 验证动作的提示取自 App 上下文，分类开关和输入直接绑定本地草稿而非远程服务状态。
/**
 * `App`：从当前根上下文取得主题化反馈能力，不把 message 当作任务成功判断。
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 * `Checkbox`：控制当前本地验证开关，仅读取 checked，不影响真实服务配置。
 * `Input`：显示受控文本草稿，值更新和提交是两个独立动作。
 * `Segmented`：切换当前本地组件验证分类，草稿仍由父页实例保存。
 * `Space`：组织当前节点间距，不能接管宿主子节点的点击或提交语义。
 */
import { App, Button, Checkbox, Input, Segmented, Space } from 'antd';
// 页面骨架固定标题与分类入口，不承担正文滚动。
/**
 * `PageContainer`：分配固定标题与剩余内容高度，长内容滚动由子组件承担。
 */
import PageContainer from '@/components/PageContainer';
// 长表单和上传区在 Card body 内滚动。
/**
 * `ScrollPanel`：为长内容提供头部固定、Card body 内部滚动的有界容器。
 */
import ScrollPanel from '@/components/ScrollPanel';
// 受控弹窗演示异步确认、正文骨架和不同 footer 情况。
/**
 * `AdminModal`：提供受控可取消的确认弹窗，标题/footer 固定且正文内部滚动。
 */
import AdminModal from '@/components/AdminModal';
// 抽屉演示长正文独立滚动与确认失败恢复。
/**
 * `AdminDrawer`：提供受控抽屉、确认门闩和正文滚动，成功关闭仍由父级更新 open。
 */
import AdminDrawer from '@/components/AdminDrawer';
// 表格消费本地 request 以验证查询、分页、错误和内部滚动。
/**
 * `ProTable`：组合已校验搜索、分页请求与有界表格正文，不猜服务端业务成功码。
 */
import ProTable from '@/components/ProTable';
// 图标选择只回填本地草稿，不影响全局菜单。
/**
 * `IconSelect`：按真实 Antd 导出名称选择图标，已选值仍由父级持有。
 */
import IconSelect from '@/components/IconSelect';
// 上传组件通过 customRequest 接入本地临时传输替身。
/**
 * `UploadFile`：提供选择、校验、传输/取消、安全资源回填与预览，服务契约由宿主明确注入。
 */
import UploadFile from '@/components/UploadFile';
// 富文本 HTML 保留在页面草稿，不展示为未经净化的业务正文。
/**
 * `RichTextEditor`：封装受控 HTML 与编辑器销毁，上传服务可选，HTML 安全由接入层负责。
 */
import RichTextEditor from '@/components/RichTextEditor';
// 验证区样式提供有界浮层内表格与长表单布局。
import './index.less';

// 固定 120 条中性记录只用于分页和筛选，不模拟任何业务接口字段。
const rows = Array.from(
  { length: 120 },
  (
    /* `_`：Array.from 的未使用元素占位，序号仅由 index 决定，不代表真实服务记录。 */ _,
    /* `index`：中性记录的零起始序号，展示 id/name 时加 1；固定总数 120。 */ index
  ) => ({
    id: index + 1,
    name: `示例条目 ${index + 1}`,
    description: '用于验证通用表格的分页、筛选和内部滚动。',
  })
);
// 故意保留较宽说明列，用于验证窄窗口横向滚动可达。
const columns = [
  { title: '名称', dataIndex: 'name', width: 240, sorter: true },
  { title: '说明', dataIndex: 'description', width: 700 },
];
// 多条件用于验证首行预算和高级搜索抽屉，字段值不进入真实接口。
const fields = [
  { name: 'keyword', label: '关键词', type: 'input', span: 6 },
  ...Array.from(
    { length: 10 },
    (
      /* `_`：额外搜索条件生成时的未使用占位，不参与字段提交。 */ _,
      /* `i`：额外条件的零起始序号，用于生成 field0..field9 和显示文本。 */ i
    ) => ({ name: `field${i}`, label: `条件 ${i + 1}`, type: 'input', span: 6 })
  ),
];
/**
 * 等待本地验证所需的毫秒延迟，不用于生产请求重试或超时控制。
 * @param {number} ms 本地示例延时，固定由本页调用。
 * @returns {Promise<void>} 计时到达后完成；该示例延迟本身不支持中止。
 */
const wait = (ms) =>
  new Promise((/* `resolve`：本地 wait Promise 的成功出口，计时结束直接完成，不提供中止能力。 */ resolve) =>
    setTimeout(resolve, ms)
  );
// 长正文用于检查标题与 footer 是否保持可见，不代表页面应整体滚动。
const longContent = Array.from(
  { length: 60 },
  (
    /* `_`：长正文生成时的未使用占位，不包含远端内容。 */ _,
    /* `i`：长正文零起始序号，作为当前固定示例列表 key 和显示行号。 */ i
  ) => <p key={i}>通用内容 {i + 1}：用于验证正文滚动时，标题、关闭入口和底部操作区保持可见。</p>
);

/**
 * 渲染框架能力的本地验收入口，不依赖后端即可操作。
 * @returns {React.ReactElement} 可整体替换的示例页面与受控浮层。
 */
export default function Components() {
  // `message`：当前根 App 的主题化消息实例，仅用于本地提示验证，不表示业务服务成功。
  const { message } = App.useApp();
  // 当前示例分类决定挂载哪个组件，其他草稿由本页保留。
  // `section`：当前挂载的组件示例分类，默认“表格”；切到其它分类不销毁父页保存的草稿。
  // `setSection`：选择当前组件验证分类；其它本地草稿继续由页面实例保留。
  const [section, setSection] = useState('表格');
  // 文本、HTML、图标和受控弹层只属于本页验证，不写入全局偏好。
  // `text`：用于验证切页缓存和提交失败保留的普通输入草稿，不写后端或存储。
  // `setText`：本地受控文本输入的发布器，切换分类不自动重置。
  const [text, setText] = useState('');
  // `html`：本页富文本 HTML 草稿，不直接渲染成业务正文或持久化。
  // `setHtml`：接收 RichTextEditor 受控内容更新，空编辑器回填空字符串。
  const [html, setHtml] = useState('');
  // `icon`：本页选择的真实 Antd 图标导出名，只验证组件回填。
  // `setIcon`：接收图标名称或空字符串，不修改全局菜单图标。
  const [icon, setIcon] = useState('');
  // `modal`：本地弹窗场景标识；空串关闭，long/loading/noFooter/table 分别选择验证内容。
  // `setModal`：更新当前受控弹窗场景，确认或取消后由父页主动置空。
  const [modal, setModal] = useState('');
  // `drawer`：本地长正文抽屉可见性，默认 false，不创建第二份提交草稿。
  // `setDrawer`：父页控制抽屉开关的发布器，成功确认或关闭入口设 false。
  const [drawer, setDrawer] = useState(false);
  // 三个失败开关分别控制提交、查询和上传，不影响实际网络。
  // `failSubmit`：本地确认故意失败的布尔开关，默认 false；开启后保留弹层和输入供恢复验证。
  // `setFailSubmit`：更新故意制造确认失败的本地开关，仅供检验草稿保留和任务解锁。
  const [failSubmit, setFailSubmit] = useState(false);
  // `failRequest`：本地查询拒绝开关，变化后通过 refreshDeps 触发表格刷新以验证恢复。
  // `setFailRequest`：更新本地请求失败开关，不拦截或修改任何真实 HTTP 服务。
  const [failRequest, setFailRequest] = useState(false);
  // `failUpload`：本地临时上传拒绝开关；当前延迟回调按其闭包快照决定成功或失败。
  // `setFailUpload`：更新下一次本地上传替身的失败条件，不代表服务端上传策略。
  const [failUpload, setFailUpload] = useState(false);
  // 计数用于观察防重复与查询行为，不能作为真实请求完成或业务成功证明。
  // `calls`：本页查询替身开始执行的累计次数，默认 0；用于观察分页/搜索是否意外重复。
  // `setCalls`：函数式发布请求计数，便于并发调用时不丢增量；不是网络审计或业务成功记录。
  const [calls, setCalls] = useState(0);
  // `submits`：本页确认入口实际开始的次数，仅用于观察防重复，不能充当生产审计。
  // `setSubmits`：函数式递增确认计数，不使用可能过期的闭包值。
  const [submits, setSubmits] = useState(0);
  // `files`：本地 UploadFile 回填的资源 URL 数组，只包含本页创建的临时 Blob 地址。
  // `setFiles`：接收上传、删除和清空后回填的当前 URL 列表，不存服务端文件记录。
  const [files, setFiles] = useState([]);
  // 本页创建的 Blob URL 集合在真正卸载时统一撤销；上传任务取消则清理自己的计时器。
  const urls = useRef(new Set());
  // 仅调用组件实际暴露的 clearFiles，不保留虚构的手动上传接口。
  const uploadRef = useRef(null);
  useEffect(
    /**
     * 捕获本页创建的 Blob URL 集合并注册真正卸载时的释放入口；缓存隐藏仍保留资源供回到页面使用。
     * @returns {Function}
     */ () => {
      // `entries`：effect 捕获的本页 Blob URL 集合，真正卸载时逐个撤销；缓存隐藏不等于卸载。
      const entries = urls.current;
      return (
        /**
         * 真正卸载时逐个撤销本页持有的 Blob URL，不读取其它页面的集合，也不能继续复用已撤销 URL。
         * @returns {void}
         */ () =>
          entries.forEach(
            (/* `url`：本页 owner 集合中的临时 Blob 地址，卸载时逐个 revoke，不能沿用已撤销 URL。 */ url) =>
              URL.revokeObjectURL(url)
          )
      );
    },
    []
  );
  /**
   * 模拟当前页的查询结果，全部读取本地固定记录，不访问后端。
   * @param {Object} params current 从 1 开始，pageSize 为当前页容量，keyword 为已提交文本条件。
   * @returns {Promise<Object>} list/total；slow 的较长延时用于检查旧响应隔离，失败开关会明确拒绝。
   */
  const request = useCallback(
    async ({
      /* `current`：本地列表替身接收的 1 起始页码，与真实 ProTable 请求契约相同。 */ current,
      /* `pageSize`：当前页容量，按固定本地数组切片；不在示例中设置业务上限。 */ pageSize,
      /* `keyword`：已提交的文本条件，默认空串；slow 使用较长延迟专门检查旧结果隔离。 */ keyword = '',
    }) => {
      setCalls((/* `value`：React 最新请求次数，函数式加 1 便于观察一次操作是否触发重复查询。 */ value) => value + 1);
      // 不同延迟用于验证旧搜索晚返回，演示数据完全本地。
      await wait(keyword === 'slow' ? 700 : 80);
      if (failRequest) throw new Error('示例加载失败，可关闭“请求失败”后重试');
      // `matches`：固定中性 rows 按当前已提交 keyword 筛出的结果数组，随后按 current/pageSize 切页。
      const matches = rows.filter(
        (/* `row`：固定中性记录当前项，仅用 name 做普通 includes 筛选，不请求远端业务数据。 */ row) =>
          row.name.includes(keyword)
      );
      return { list: matches.slice((current - 1) * pageSize, current * pageSize), total: matches.length };
    },
    [failRequest]
  );
  /**
   * 模拟单次确认，演示取消后不再修改外部受控状态。
   * @param {Object} _event 原点击事件，此示例不读取。
   * @param {Object} context signal 是浮层当前周期，await 后必须检查是否已取消。
   * @returns {Promise<void>} 失败开关打开时拒绝并保留草稿，否则请求父级关闭浮层。
   */
  const submit = async (
    _event,
    { /* `signal`：浮层交给本次确认的 AbortSignal；延迟后先检查 aborted 再改变父级可见性。 */ signal }
  ) => {
    setSubmits((/* `value`：React 最新确认次数，函数式加 1，重复动作应被浮层同步门闩拦截。 */ value) => value + 1);
    await wait(500);
    if (signal.aborted) return;
    if (failSubmit) throw new Error('示例提交失败，输入已保留');
    setModal('');
    setDrawer(false);
  };
  /**
   * 实现 Antd customRequest 的本地替身：延迟后创建 Blob URL 或报告失败。
   * @param {Object} options file 为本地文件，onSuccess/onError 按 Antd 协议回调。
   * @returns {Object} abort() 清理本任务计时器；未完成任务取消后不创建临时 URL。
   */
  const upload = ({
    /* `file`：Antd customRequest 提供的本地 File，仅创建临时预览 URL，不上传服务器。 */ file,
    /* `onSuccess`：Antd 传输成功回调，收到 {url}；仅用于本地组件验收，不可复制成生产默认成功服务。 */ onSuccess,
    /* `onError`：Antd 传输失败回调，故意失败时接收公开 Error，不创建临时资源。 */ onError,
  }) => {
    // `timer`：当前 customRequest 替身独有的 400ms timeout，abort 仅清理该任务，不创建迟到资源。
    const timer = setTimeout(() => {
      if (failUpload) {
        onError(new Error('示例上传失败'));
        return;
      }
      // `url`：本次成功替身创建的 Blob URL，登记到 owner 集合，卸载后统一 revoke。
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      onSuccess({ url });
    }, 400);
    return {
      abort: /**
       * 取消当前本地上传替身的 timeout，避免清空或卸载后再触发成功事件；真实服务应提供自己的 abort。
       * @returns {void}
       */ () => clearTimeout(timer),
    };
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
          toolBarRender={
            /**
             * 渲染表格请求故障开关，状态归父页保存，切换开关后由下一次显式查询验证失败恢复。
             * @returns {React.ReactElement}
             */ () => (
              <Checkbox
                checked={failRequest}
                onChange={(/* `e`：请求失败 Checkbox 的变更事件，只读取 target.checked 更新本地开关。 */ e) =>
                  setFailRequest(e.target.checked)
                }
              >
                请求失败
              </Checkbox>
            )
          }
        />
      )}
      {section === '表单与弹层' && (
        <ScrollPanel title={`表单与反馈（确认 ${submits} 次）`}>
          <Space direction="vertical" size="middle" className="component-form">
            <Input
              aria-label="缓存输入"
              placeholder="切换页签后保留此输入"
              value={text}
              onChange={(/* `e`：缓存验证输入的变更事件，只读取当前文本并保留到父页草稿。 */ e) =>
                setText(e.target.value)
              }
            />
            <IconSelect value={icon} onChange={setIcon} />
            <Checkbox
              checked={failSubmit}
              onChange={(/* `e`：确认失败 Checkbox 的变更事件，影响后续本地 submit 的拒绝分支。 */ e) =>
                setFailSubmit(e.target.checked)
              }
            >
              提交失败
            </Checkbox>
            <div className="starter-actions">
              <Button
                onClick={
                  /**
                   * 显示公开成功提示以验证根 App 反馈桥；不代表任何远端业务操作成功。
                   * @returns {void}
                   */ () => message.success('提示组件正常')
                }
              >
                显示提示
              </Button>
              <Button
                onClick={
                  /**
                   * 选择长正文弹窗示例，具体显示和关闭仍由受控 modal 状态决定。
                   * @returns {void}
                   */ () => setModal('long')
                }
              >
                打开长弹窗
              </Button>
              <Button
                onClick={
                  /**
                   * 选择正文骨架加载弹窗，演示 loading 与确认动作 pending 是独立状态。
                   * @returns {void}
                   */ () => setModal('loading')
                }
              >
                加载弹窗
              </Button>
              <Button
                onClick={
                  /**
                   * 选择无 footer 弹窗，保留统一正文滚动和标题关闭入口。
                   * @returns {void}
                   */ () => setModal('noFooter')
                }
              >
                无底部弹窗
              </Button>
              <Button
                onClick={
                  /**
                   * 选择弹窗内表格示例，表格高度由弹窗正文分配，不能让页面根节点滚动。
                   * @returns {void}
                   */ () => setModal('table')
                }
              >
                弹窗内表格
              </Button>
              <Button
                onClick={
                  /**
                   * 打开长正文抽屉示例，关闭后仍保留父页草稿供取消/重开验证。
                   * @returns {void}
                   */ () => setDrawer(true)
                }
              >
                打开长抽屉
              </Button>
            </div>
            {longContent}
          </Space>
        </ScrollPanel>
      )}
      {section === '上传与编辑' && (
        <ScrollPanel title="上传与编辑">
          <Checkbox
            checked={failUpload}
            onChange={(/* `e`：上传失败 Checkbox 的变更事件，影响下一次 customRequest 替身。 */ e) =>
              setFailUpload(e.target.checked)
            }
          >
            上传失败
          </Checkbox>
          <Button
            onClick={
              /**
               * 调用当前上传组件公开 clearFiles 能力，统一撤销旧选择周期，不直接修改其内部列表。
               * @returns {void}
               */ () => uploadRef.current?.clearFiles()
            }
          >
            清空文件
          </Button>
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
        onCancel={
          /**
           * 关闭当前示例弹窗，将 modal 恢复为空串；内部动作取消由 AdminModal 生命周期处理。
           * @returns {void}
           */ () => setModal('')
        }
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
      <AdminDrawer
        title="通用抽屉"
        open={drawer}
        onClose={
          /**
           * 关闭当前示例抽屉，不提交草稿；内部确认周期随受控 open 关闭而撤销。
           * @returns {void}
           */ () => setDrawer(false)
        }
        onOk={submit}
        width={560}
      >
        {longContent}
      </AdminDrawer>
    </PageContainer>
  );
}

// ───── 模块结束：src/pages/Components/index.jsx ─────
