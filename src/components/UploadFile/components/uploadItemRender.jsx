/**
 * 模块职责：给 Antd 上传列表补充缩略图、进度以及可访问的预览/下载/移除操作。
 * 列表状态和动作锁仍归 UploadFile；此工厂只闭包捕获当前 render 的配置，不建立第二个文件 owner。
 * 没有覆盖的状态返回 originNode，保持上游控件默认显示。
 */
// React 只组合列表节点；数据和生命周期继续由上传主组件持有。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// Progress/Spin 展示传输过程，Button 让图标动作可键盘触达。
/**
 * `Progress`：显示按 uid 保存的传输百分比，不表示服务器业务处理成功。
 * `Spin`：展示等待视觉，不拥有请求、超时、取消或重试生命周期。
 * `Button`：提供可聚焦的显式操作入口，禁用/等待与真实动作锁仍由本模块状态决定。
 */
import { Progress, Spin, Button } from 'antd';
// 三类操作图标配合明确 aria-label，不把图标形状当唯一含义。
/**
 * `DeleteOutlined`：文件移除入口的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `DownloadOutlined`：文件下载入口的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `EyeOutlined`：文件预览入口的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import { DeleteOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
// 默认文件图标只按显示扩展名分类，不承担实际文件内容校验。
/**
 * `getFileIcon`：按 file.name 末段扩展名选择图片、视频、文档或默认图标。
 */
import { getFileIcon } from './getFileIcon';

/**
 * 捕获当前上传快照并构造 Antd 列表项渲染器；不创建第二个文件 owner。
 * @param {Object} options 当前 render 的纯显示配置与 owner 操作入口。
 * @param {string} options.listType picture-card 已完成项使用自定义资源卡片，其余状态按分支回退。
 * @param {string} options.fileType 宿主文件分类，辅助决定缩略图或文件图标。
 * @param {boolean} options.disabled 禁止默认移除，不阻止已存在文件的预览。
 * @param {boolean} options.showPreview 是否展示默认预览按钮。
 * @param {boolean} options.showDownload 是否展示默认下载按钮。
 * @param {boolean} options.showRemove 是否展示默认移除按钮，disabled 仍优先。
 * @param {boolean} options.showProgress 是否在传输中展示 uid 对应进度。
 * @param {Object} options.uploadProgress uid 到百分比的当前快照；只读取，不持久化。
 * @param {Function} options.onPreview 接收当前 file，委托上传 owner 决定打开方式。
 * @param {Function} options.onDownload 接收当前 file，下载完成和来源限制由 owner 负责。
 * @param {Function} options.onRemove 接收当前 file，异步许可/取消和失败由 owner 处理。
 * @returns {Function} 同步 UploadFileItemRender(originNode,file)；未覆盖状态保留 originNode，按钮可键盘触达。
 */
export function createUploadItemRender({
  listType,
  fileType,
  disabled,
  showPreview,
  showDownload,
  showRemove,
  showProgress,
  uploadProgress,
  onPreview,
  onDownload,
  onRemove,
}) {
  /**
   * 按文件当前状态选择自定义卡片、进度或上游默认节点。
   * @param {React.ReactNode} originNode Antd 原列表项，用于未覆盖状态回退。
   * @param {Object} file 当前带 uid/status 的条目，不在这里修改它。
   * @returns {React.ReactNode} 操作仅转发当前文件，禁用状态不显示默认移除入口。
   */
  function UploadFileItemRender(originNode, file) {
    if (listType === 'picture-card' && file.status === 'done') {
      // `isImage`：宿主分类为 image 或条目 MIME 以 image/ 开始的显示判断；不代替文件内容安全验证。
      const isImage = fileType === 'image' || (file.type && file.type.startsWith('image/'));

      return (
        <div className="upload-file-item">
          {isImage ? (
            <img
              src={file.url || file.thumbUrl}
              alt={file.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="upload-file-icon">{getFileIcon(file)}</div>
          )}
          <div className="upload-file-actions">
            {showPreview && (
              <Button
                type="text"
                aria-label={`预览 ${file.name}`}
                icon={<EyeOutlined />}
                onClick={
                  /**
                   * 请求上传 owner 预览本条 file，资源协议和可见性由外层校验，不在条目组件另建预览状态。
                   * @returns {void}
                   */ () => onPreview(file)
                }
              />
            )}
            {showDownload && (
              <Button
                type="text"
                aria-label={`下载 ${file.name}`}
                icon={<DownloadOutlined />}
                onClick={
                  /**
                   * 请求上传 owner 下载本条 file；按钮不自行拼接 URL，也不据点击判断下载完成。
                   * @returns {void}
                   */ () => onDownload(file)
                }
              />
            )}
            {!disabled && showRemove && (
              <Button
                type="text"
                aria-label={`移除 ${file.name}`}
                icon={<DeleteOutlined />}
                onClick={
                  /**
                   * 请求上传 owner 移除本条 file，异步许可、失败恢复与受控列表更新由外层统一完成。
                   * @returns {void}
                   */ () => onRemove(file)
                }
              />
            )}
          </div>
        </div>
      );
    }

    if (file.status === 'uploading' && showProgress && uploadProgress[file.uid]) {
      return (
        <div className="upload-file-item uploading">
          <Spin />
          <Progress percent={Math.round(uploadProgress[file.uid])} size="small" style={{ margin: '8px 0' }} />
        </div>
      );
    }

    return originNode;
  }

  UploadFileItemRender.displayName = 'UploadFileItemRender';
  return UploadFileItemRender;
}

// ───── 模块结束：src/components/UploadFile/components/uploadItemRender.jsx ─────
