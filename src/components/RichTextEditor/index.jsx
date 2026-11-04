/**
 * 模块职责：提供 WangEditor 的受控 HTML 编辑和可选图片上传接入口，不内置上传地址或响应字段。
 * value/onChange 的 HTML 归父级持有；内容公开展示前必须由接入方按实际信任边界净化。
 * 编辑器实例在组件释放时销毁；上传函数的取消、错误提示和服务端验证由注入方负责。
 */
// React memo 固定编辑器初始配置，state 保存实例供工具栏使用，effect 对应销毁。
/**
 * `useEffect`：在提交后同步外部状态/绑定副作用，依赖变化和卸载时释放旧 owner。
 * `useMemo`：按声明依赖派生配置/视图，不能作为永不丢失的业务状态或副作用所有者。
 * `useState`：保存当前实例的展示快照；异步操作的同步互斥另由 ref 门闩承担。
 */
import { useEffect, useMemo, useState } from 'react';
// Editor/Toolbar 共享同一实例，组件不创建独立的第二个富文本状态。
/**
 * `Editor`：承载父级受控 HTML 编辑，内容展示前仍由接入方净化。
 * `Toolbar`：绑定当前同一编辑器实例，上传入口按注入能力明确隐藏。
 */
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
// 编辑器的基础结构依赖上游样式，不能只保留外层高度而移除它。
import '@wangeditor/editor/dist/css/style.css';
// 外壳将编辑器放入自身内容区，不放开文档根滚动。
import './index.less';

/**
 * 创建受控 HTML 编辑区，空内容统一回填空字符串。
 * @param {Object} props value 为 HTML，onChange(html) 由父级处理持久化。
 * @param {Function} [props.uploadImage] 接收 File，返回可插入图片 URL 的 Promise；省略时隐藏上传入口。
 * @param {number} [props.height=300] 编辑正文高度，单位 px；长页面仍放入 ScrollPanel。
 * @param {string} [props.placeholder=请输入内容] 空编辑器提示。
 * @returns {React.ReactElement} 工具栏与编辑器；不负责 HTML 消毒或业务提交。
 */
export default function RichTextEditor({
  /* `value`：父级持有的 HTML 文本，默认空串；公开展示前由接入方按信任边界净化。 */ value = '',
  /* `onChange`：父级的内容更新通知，接收 HTML 或空字符串；持久化与防重复提交由父级负责。 */ onChange,
  uploadImage,
  height = 300,
  placeholder = '请输入内容',
}) {
  // 实例由 onCreated 发布，只供当前工具栏和销毁 effect 使用，不写入全局 model。
  // `editor`：当前 WangEditor 实例，初始 null；由 onCreated 发布并在 effect 清理中 destroy，不写入全局模型。
  // `setEditor`：接收 WangEditor.onCreated 的实例发布器，使工具栏与销毁 effect 连接同一编辑器。
  const [editor, setEditor] = useState(null);
  // `config`：由 placeholder/uploadImage 派生的编辑器初始配置；无上传服务时不创建默认上传处理。
  const config = useMemo(
    () => ({
      placeholder,
      MENU_CONF: uploadImage
        ? {
            uploadImage: {
              /**
               * 把上游选中的图片交给宿主服务，服务成功后才调用编辑器插入接口。
               * @param {File} file 上游提供的图片文件。
               * @param {Function} insert WangEditor 的图片插入回调，接收 URL/替代文本/链接。
               * @returns {Promise<void>} 上传拒绝继续向编辑器传递；注入服务需处理退出后的取消。
               */
              async customUpload(file, insert) {
                // `url`：宿主 uploadImage 成功返回的图片资源地址；来源校验/内容安全和取消由注入服务承担。
                const url = await uploadImage(file);
                insert(url, file.name, url);
              },
            },
          }
        : {},
    }),
    [placeholder, uploadImage]
  );
  // 未注入图片上传服务时隐藏图片/视频上传按钮，避免出现无法执行的默认入口。
  // `toolbar`：由上传能力派生的工具栏排除项；始终隐藏未封装的视频上传。
  const toolbar = useMemo(
    () => ({ excludeKeys: uploadImage ? ['uploadVideo'] : ['uploadImage', 'uploadVideo'] }),
    [uploadImage]
  );
  useEffect(
    /**
     * 将当前 editor 实例绑定到 effect 生命周期；实例替换或组件卸载时销毁旧实例，不销毁后续新建编辑器。
     * @returns {Function} 当前实例的清理函数。
     */ () =>
      /**
       * 销毁此 effect 捕获的编辑器，释放 DOM 监听与资源；实例尚未创建时为空操作。
       * @returns {void}
       */ () =>
        editor?.destroy(),
    [editor]
  );
  return (
    <div className="rich-text-editor-wrapper">
      <Toolbar editor={editor} defaultConfig={toolbar} />
      <Editor
        value={value}
        defaultConfig={config}
        onCreated={setEditor}
        style={{ height }}
        onChange={(
          /* `instance`：WangEditor 本次变更对应的实例；空编辑器回填空串，非空读取当前 getHtml。 */ instance
        ) => onChange?.(instance.isEmpty() ? '' : instance.getHtml())}
      />
    </div>
  );
}

// ───── 模块结束：src/components/RichTextEditor/index.jsx ─────
