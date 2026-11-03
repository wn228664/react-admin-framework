import { useEffect, useMemo, useState } from 'react';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import '@wangeditor/editor/dist/css/style.css';
import './index.less';

// 上传由宿主显式注入，框架不携带服务地址和响应字段假设。
export default function RichTextEditor({
  value = '',
  onChange,
  uploadImage,
  height = 300,
  placeholder = '请输入内容',
}) {
  const [editor, setEditor] = useState(null);
  const config = useMemo(
    () => ({
      placeholder,
      MENU_CONF: uploadImage
        ? {
            uploadImage: {
              async customUpload(file, insert) {
                const url = await uploadImage(file);
                insert(url, file.name, url);
              },
            },
          }
        : {},
    }),
    [placeholder, uploadImage]
  );
  const toolbar = useMemo(
    () => ({ excludeKeys: uploadImage ? ['uploadVideo'] : ['uploadImage', 'uploadVideo'] }),
    [uploadImage]
  );
  useEffect(() => () => editor?.destroy(), [editor]);
  return (
    <div className="rich-text-editor-wrapper">
      <Toolbar editor={editor} defaultConfig={toolbar} />
      <Editor
        value={value}
        defaultConfig={config}
        onCreated={setEditor}
        style={{ height }}
        onChange={(instance) => onChange?.(instance.isEmpty() ? '' : instance.getHtml())}
      />
    </div>
  );
}
