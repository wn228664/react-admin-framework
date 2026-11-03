import React from 'react';
import { Progress, Spin, Button } from 'antd';
import { DeleteOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { getFileIcon } from './getFileIcon';

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
  function UploadFileItemRender(originNode, file) {
    if (listType === 'picture-card' && file.status === 'done') {
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
                onClick={() => onPreview(file)}
              />
            )}
            {showDownload && (
              <Button
                type="text"
                aria-label={`下载 ${file.name}`}
                icon={<DownloadOutlined />}
                onClick={() => onDownload(file)}
              />
            )}
            {!disabled && showRemove && (
              <Button
                type="text"
                aria-label={`移除 ${file.name}`}
                icon={<DeleteOutlined />}
                onClick={() => onRemove(file)}
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
