/**
 * @file src/components/UploadFile/index.jsx
 * @description UploadFile 通用上传组件，封装 antd Upload 的 URL 回填、上传前校验、预览/下载和进度管理。
 */
import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo, useRef, useCallback } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Upload, message, theme } from 'antd';
import { getToken } from '@/utils/auth';
import logger from '@/utils/logger';
import { getApiBaseUrl } from '@/utils/robust';
import {
  buildUploadFileListWithResolvedUrl,
  buildUploadSizeErrorMessage,
  buildUploadTypeErrorMessage,
  buildUploadFileList,
  collectUploadedUrls,
  extractUrlFromUploadResponse,
  normalizeValueToUrls,
  removeUploadFileByUid,
  removeUploadProgressByUid,
  resolveAcceptAttr,
  resolveAcceptMimeTypes,
  resolveUploadFileAsset,
  resolveUploadHeaders,
  resolveUploadResponseErrorMessage,
  resolveUploadUrl,
} from './utils';
import PreviewModal from './components/PreviewModal';
import UploadButton from './components/UploadButton';
import { compressImage } from './components/compressImage';
import { createUploadItemRender } from './components/uploadItemRender';
import './index.less';
/**
 * 通用文件上传组件
 *
 * @component
 * @param {Object} props - 组件属性
 *
 * 基础配置
 * @param {string|string[]} props.value - 文件值（受控组件，可以是字符串URL或URL数组）
 * @param {Function} props.onChange - 值变化回调（用于表单集成）
 * @param {boolean} props.disabled - 是否禁用，默认false
 * @param {string} props.className - 自定义类名
 * @param {Object} props.style - 自定义样式
 *
 * 文件限制
 * @param {number} props.maxCount - 最大文件数量，默认1
 * @param {number} props.maxSize - 最大文件大小(MB)，默认20
 * @param {string} props.fileType - 文件类型限制，可选值: 'image', 'video', 'audio', 'document', 'file', 'all'，默认'image'
 * @param {Array} props.acceptTypes - 具体的MIME类型数组，如['image/jpeg', 'image/png']（优先级高于fileType）
 * @param {string} props.accept - HTML accept属性，默认根据fileType自动设置
 *
 * 上传配置
 * @param {string} props.uploadUrl - 上传地址，由调用方提供（会自动拼接环境前缀）
 * @param {Object} props.uploadData - 上传时携带的额外参数，默认{}
 * @param {Object} props.headers - 自定义请求头，默认自动添加Authorization
 * @param {string} props.method - 上传请求方法，默认'POST'
 * @param {string} props.fieldName - 上传文件的字段名，默认'file'
 * @param {boolean} props.withCredentials - 是否携带cookie，默认false
 *
 * 显示配置
 * @param {number} props.width - 上传框宽度，默认104px
 * @param {number} props.height - 上传框高度，默认104px
 * @param {string} props.listType - 上传列表的内建样式，支持：'picture-card'（默认）、'picture'、'text'
 * @param {string} props.placeholder - 上传按钮提示文字，默认'上传'
 * @param {string} props.tips - 底部提示文字
 * @param {boolean} props.multiple - 是否支持多选，默认false
 * @param {boolean} props.showFileList - 是否展示文件列表，默认true
 * @param {boolean} props.showProgress - 是否显示上传进度，默认true
 *
 * 功能配置
 * @param {boolean} props.showPreview - 是否显示预览功能，默认true
 * @param {boolean} props.showDownload - 是否显示下载功能，默认false
 * @param {boolean} props.showRemove - 是否显示删除功能，默认true（disabled时自动为false）
 * @param {boolean} props.draggable - 是否支持拖拽上传，默认false
 * @param {boolean} props.imageCompression - 是否启用图片压缩，默认false
 * @param {number} props.imageCompressionQuality - 图片压缩质量（0-1），默认0.8
 * @param {number} props.imageCompressionMaxWidth - 图片压缩最大宽度，默认1920
 * @param {number} props.imageCompressionMaxHeight - 图片压缩最大高度，默认1920
 *
 * 回调函数
 * @param {Function} props.beforeUpload - 上传前的钩子函数，参数为file，返回false则停止上传
 * @param {Function} props.onPreview - 自定义预览处理函数
 * @param {Function} props.onDownload - 自定义下载处理函数
 * @param {Function} props.onRemove - 删除文件的回调
 * @param {Function} props.onSuccess - 上传成功的回调，参数为(response, file)
 * @param {Function} props.onError - 上传失败的回调，参数为(error, file)
 * @param {Function} props.onProgress - 上传进度回调，参数为(percent, file)
 * @param {Function} props.customRequest - 自定义上传实现
 *
 * 响应数据配置
 * @param {string|Function} props.dataPath - 响应数据中文件URL的路径，默认'data.link'，支持函数
 * @param {Function} props.dataTransform - 响应数据转换函数，参数为response，返回文件URL
 * @param {Function} props.validateResponse - 返回 true/undefined 表示接受，false/错误文案表示拒绝
 *
 * Ref方法
 * @method clearFiles - 清空所有文件
 * @method getFileList - 获取当前文件列表
 *
 * @example
 * // 基础使用
 * <UploadFile value={imageUrl} onChange={setImageUrl} uploadUrl={uploadEndpoint} />
 *
 * @example
 * // 多文件上传
 * <UploadFile
 *   value={images}
 *   onChange={setImages}
 *   maxCount={5}
 *   multiple
 * />
 *
 * @example
 * // 视频上传
 * <UploadFile
 *   value={videoUrl}
 *   onChange={setVideoUrl}
 *   fileType="video"
 *   maxSize={100}
 * />
 *
 * @example
 * // 表单中使用
 * <Form.Item name="image" rules={[{ required: true }]}>
 *   <UploadFile />
 * </Form.Item>
 */
const UploadFile = forwardRef((props, ref) => {
  const { token: antdToken } = theme.useToken();
  const {
    // 基础配置
    value,
    onChange,
    disabled = false,
    className = '',
    style = {},

    // 文件限制
    maxCount = 1,
    maxSize = 20,
    fileType = 'image',
    acceptTypes,
    accept,

    // 上传配置
    uploadUrl = '',
    uploadData = {},
    headers: customHeaders,
    method = 'POST',
    fieldName = 'file',
    withCredentials = false,

    // 显示配置
    width = 104,
    height = 104,
    listType = 'picture-card',
    placeholder = '上传',
    tips = '',
    multiple = false,
    showFileList = true,
    showProgress = true,

    // 功能配置
    showPreview = true,
    showDownload = false,
    showRemove = true,
    draggable = false,
    imageCompression = false,
    imageCompressionQuality = 0.8,
    imageCompressionMaxWidth = 1920,
    imageCompressionMaxHeight = 1920,

    // 回调函数
    beforeUpload: customBeforeUpload,
    onPreview: customPreview,
    onDownload: customDownload,
    onRemove: customRemove,
    onSuccess: customSuccess,
    onError: customError,
    onProgress: customProgress,
    onUploadStart,
    onUploadEnd,
    customRequest,

    // 响应数据配置
    dataPath = 'data.link',
    dataTransform,
    validateResponse,
    children,
  } = props;

  const [fileList, setFileList] = useState([]);
  const [uploadCycle, setUploadCycle] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewType, setPreviewType] = useState('image');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const activeUploadUidSetRef = useRef(new Set());
  const uploadRef = useRef(null);
  const mounted = useRef(false);
  const revision = useRef(0);
  const settled = useRef(new Set());
  const removing = useRef(new Set());
  useEffect(() => {
    mounted.current = true;
    revision.current = uploadCycle;
    const activeUploads = activeUploadUidSetRef.current;
    return () => {
      mounted.current = false;
      revision.current += 1;
      // rc-upload 自身在卸载时 abort；此时再调用已卸载实例会访问空的内部 ref。
      activeUploads.clear();
    };
  }, [uploadCycle]);

  /**
   * 标记某个文件进入上传中；同一 uid 重复 progress 事件不会重复触发开始回调。
   * @param {Record<string, any>} file 当前上传文件。
   * @returns {void}
   */
  const markUploadStarted = useCallback(
    (file) => {
      const fileUid = file?.uid;
      if (!fileUid || activeUploadUidSetRef.current.has(fileUid)) {
        return;
      }

      activeUploadUidSetRef.current.add(fileUid);
      onUploadStart && onUploadStart(file);
      setLoading(true);
    },
    [onUploadStart]
  );

  /**
   * 标记某个文件离开上传中；仅首个结束事件会生效，并在全部上传完成后关闭 loading。
   * @param {Record<string, any>} file 当前结束上传的文件。
   * @returns {void}
   */
  const markUploadEnded = useCallback(
    (file) => {
      const fileUid = file?.uid;
      if (!fileUid || !activeUploadUidSetRef.current.has(fileUid)) {
        return;
      }

      activeUploadUidSetRef.current.delete(fileUid);
      onUploadEnd && onUploadEnd(file);
      setLoading(activeUploadUidSetRef.current.size > 0);
    },
    [onUploadEnd]
  );

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    clearFiles: () => {
      revision.current += 1;
      setUploadCycle((cycle) => cycle + 1);
      fileList.forEach((file) => settled.current.add(file.uid));
      uploadRef.current?.upload?.abort();
      fileList.filter((file) => file.status === 'uploading').forEach(markUploadEnded);
      activeUploadUidSetRef.current.clear();
      setLoading(false);
      setFileList([]);
      setUploadProgress({});
      onChange && onChange(maxCount === 1 ? '' : []);
    },
    getFileList: () => fileList,
  }));

  // 获取完整的上传地址（自动拼接环境前缀）
  const uploadActionUrl = useMemo(() => {
    const baseUrl = getApiBaseUrl('/api');
    return resolveUploadUrl({ baseUrl, uploadUrl });
  }, [uploadUrl]);

  // 获取请求头
  const token = getToken();
  const uploadHeaders = useMemo(() => resolveUploadHeaders({ token, customHeaders }), [token, customHeaders]);

  // 将value转换为fileList格式
  useEffect(() => {
    if (value === undefined) return;
    const urls = normalizeValueToUrls(value);
    // 某个文件成功后的受控回填不能清掉其它仍在上传的文件。
    setFileList((previous) => [
      ...buildUploadFileList(urls).map((item) => previous.find((file) => file.url === item.url) || item),
      ...previous.filter((file) => file.status === 'uploading'),
    ]);
  }, [value]);

  // 获取文件类型的MIME配置
  const acceptMimeTypes = useMemo(() => resolveAcceptMimeTypes({ fileType, acceptTypes }), [fileType, acceptTypes]);

  // 获取accept属性
  const acceptAttr = useMemo(() => resolveAcceptAttr({ fileType, accept }), [fileType, accept]);

  // 上传前的校验
  const handleBeforeUpload = async (file) => {
    // 捕获选择周期，清空前已排队、尚未执行的 beforeUpload 也必须失效。
    const version = uploadCycle;
    const active = () => mounted.current && revision.current === version && !settled.current.has(file.uid);
    try {
      // 自定义的beforeUpload钩子
      if (customBeforeUpload) {
        const result = await customBeforeUpload(file);
        if (!active() || result === false || result === Upload.LIST_IGNORE) {
          return Upload.LIST_IGNORE;
        }
      }

      if (!active()) return Upload.LIST_IGNORE;
      const uploadTypeErrorMessage = buildUploadTypeErrorMessage({
        file,
        fileType,
        acceptMimeTypes,
      });
      if (uploadTypeErrorMessage) {
        message.error(uploadTypeErrorMessage);
        return Upload.LIST_IGNORE;
      }

      const uploadSizeErrorMessage = buildUploadSizeErrorMessage({
        file,
        maxSize,
      });
      if (uploadSizeErrorMessage) {
        message.error(uploadSizeErrorMessage);
        return Upload.LIST_IGNORE;
      }

      // 图片压缩
      if (imageCompression && file.type.startsWith('image/')) {
        try {
          const compressedFile = await compressImage({
            file,
            maxWidth: imageCompressionMaxWidth,
            maxHeight: imageCompressionMaxHeight,
            quality: imageCompressionQuality,
          });
          return active() ? compressedFile : Upload.LIST_IGNORE;
        } catch (error) {
          if (!active()) return Upload.LIST_IGNORE;
          logger.warn('图片压缩失败:', error);
          message.warning('图片压缩失败，将上传原图');
        }
      }

      return active() ? true : Upload.LIST_IGNORE;
    } catch (error) {
      if (!active()) return Upload.LIST_IGNORE;
      logger.error('上传前校验失败:', error);
      return Upload.LIST_IGNORE;
    }
  };

  // 文件状态改变的回调
  const handleChange = ({ file, fileList: newFileList }) => {
    if (!mounted.current || uploadCycle !== revision.current || settled.current.has(file.uid)) return;
    if (file.status === 'done' || file.status === 'error') settled.current.add(file.uid);
    setFileList(newFileList);

    // 上传中
    if (file.status === 'uploading') {
      markUploadStarted(file);
      if (showProgress && file.percent !== undefined) {
        setUploadProgress((prev) => ({
          ...prev,
          [file.uid]: file.percent,
        }));
        customProgress && customProgress(file.percent, file);
      }
    }

    // 上传成功
    if (file.status === 'done') {
      markUploadEnded(file);
      setUploadProgress((prev) => removeUploadProgressByUid(prev, file.uid));

      // 处理响应数据
      const response = file.response;

      let responseErrorMessage;
      let fileUrl;
      try {
        responseErrorMessage = resolveUploadResponseErrorMessage(response, validateResponse);
        fileUrl = extractUrlFromUploadResponse({ response, dataPath, dataTransform });
      } catch (error) {
        responseErrorMessage = error?.message || '上传响应解析失败';
      }
      if (responseErrorMessage) {
        message.error(responseErrorMessage);
        const filteredList = removeUploadFileByUid(newFileList, file.uid);
        setFileList(filteredList);
        customError && customError(response, file);
        return;
      }

      // 获取文件URL
      if (!fileUrl) {
        message.error('未获取到有效文件地址，上传结果未保存');
        customError?.(new Error('INVALID_UPLOAD_URL'), file);
        const filteredList = removeUploadFileByUid(newFileList, file.uid);
        setFileList(filteredList);
        return;
      }

      const updatedList = buildUploadFileListWithResolvedUrl(newFileList, file.uid, fileUrl);
      setFileList(updatedList);

      // 触发onChange回调（用于表单）
      const urls = collectUploadedUrls(updatedList);
      onChange && onChange(maxCount === 1 ? urls[0] || '' : urls);

      // 触发自定义成功回调
      customSuccess && customSuccess(response, file);

      message.success(`${file.name} 上传成功！`);
    }

    // 上传失败
    if (file.status === 'error') {
      markUploadEnded(file);
      setUploadProgress((prev) => removeUploadProgressByUid(prev, file.uid));

      message.error(`${file.name} 上传失败！`);

      // 移除失败的文件
      const filteredList = removeUploadFileByUid(newFileList, file.uid);
      setFileList(filteredList);

      // 触发自定义错误回调
      customError && customError(file.error, file);
    }
  };

  // 删除文件
  const handleRemove = async (file) => {
    if (disabled || !showRemove || removing.current.has(file.uid)) return false;
    removing.current.add(file.uid);
    const version = revision.current;
    try {
      if ((await customRemove?.(file)) === false) return false;
      if (!mounted.current || version !== revision.current) return false;
      settled.current.add(file.uid);
      uploadRef.current?.upload?.abort(file);
      markUploadEnded(file);
      const next = removeUploadFileByUid(fileList, file.uid);
      setFileList(next);
      setUploadProgress((previous) => removeUploadProgressByUid(previous, file.uid));
      const urls = collectUploadedUrls(next);
      onChange?.(maxCount === 1 ? urls[0] || '' : urls);
      return true;
    } catch (error) {
      if (mounted.current && version === revision.current) message.error(error?.message || '移除失败，请重试');
      return false;
    } finally {
      removing.current.delete(file.uid);
    }
  };

  // 预览文件
  const handlePreview = (file) => {
    // 自定义预览处理
    if (customPreview) {
      customPreview(file);
      return;
    }

    const { fileUrl, fileName, previewType: nextPreviewType } = resolveUploadFileAsset({ file, fileType });
    if (!fileUrl) {
      message.warning('无法预览该文件');
      return;
    }

    if (nextPreviewType !== 'other') {
      setPreviewImage(fileUrl);
      setPreviewTitle(fileName);
      setPreviewType(nextPreviewType);
      setPreviewVisible(true);
      return;
    }

    // 其他文件，打开新窗口
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  // 下载文件
  const handleDownload = (file) => {
    // 自定义下载处理
    if (customDownload) {
      customDownload(file);
      return;
    }

    const { fileUrl, fileName } = resolveUploadFileAsset({ file, fileType });
    if (!fileUrl) {
      message.warning('无法下载该文件');
      return;
    }

    // 创建a标签下载
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('开始下载...');
  };

  // 关闭预览
  const handleCancelPreview = () => {
    setPreviewVisible(false);
    setPreviewImage('');
    setPreviewTitle('');
  };

  // 自定义item渲染（用于添加预览、下载和删除按钮）
  const itemRender = createUploadItemRender({
    listType,
    fileType,
    disabled,
    showPreview,
    showDownload,
    showRemove,
    showProgress,
    uploadProgress,
    onPreview: handlePreview,
    onDownload: handleDownload,
    onRemove: handleRemove,
  });

  const uploadProps = {
    name: fieldName,
    action: uploadActionUrl,
    headers: uploadHeaders,
    data: uploadData,
    listType,
    fileList,
    accept: acceptAttr,
    multiple: multiple && maxCount > 1,
    maxCount,
    disabled: disabled || (!uploadUrl && !customRequest),
    beforeUpload: handleBeforeUpload,
    onChange: handleChange,
    onRemove: handleRemove,
    onPreview: showPreview ? handlePreview : undefined,
    onDownload: showDownload ? handleDownload : undefined,
    itemRender,
    showUploadList: showFileList
      ? {
          showPreviewIcon: showPreview,
          showDownloadIcon: showDownload,
          showRemoveIcon: !disabled && showRemove,
        }
      : false,
    method,
    withCredentials,
    ...(customRequest && { customRequest }),
  };

  const UploadComponent = draggable ? Upload.Dragger : Upload;

  return (
    <div className={`upload-file-wrapper ${className}`} style={style}>
      <UploadComponent
        {...uploadProps}
        key={uploadCycle}
        ref={uploadRef}
        className="upload-file-component"
        style={{
          '--upload-width': `${width}px`,
          '--upload-height': `${height}px`,
        }}
      >
        {fileList.length >= maxCount ? null : draggable ? (
          <div style={{ padding: '24px 16px' }}>
            <p className="ant-upload-drag-icon">
              <PlusOutlined style={{ fontSize: 48, color: antdToken.colorPrimary }} />
            </p>
            <p className="ant-upload-text">{placeholder || '点击或拖拽文件到此区域上传'}</p>
            {tips && <p className="ant-upload-hint">{tips}</p>}
          </div>
        ) : (
          children || <UploadButton loading={loading} placeholder={placeholder} />
        )}
      </UploadComponent>

      {/* 底部提示 */}
      {tips && !draggable && (
        <div className="upload-tips" style={{ marginTop: 8, color: antdToken.colorTextSecondary, fontSize: 12 }}>
          {tips}
        </div>
      )}

      <PreviewModal
        open={previewVisible}
        title={previewTitle}
        type={previewType}
        src={previewImage}
        onCancel={handleCancelPreview}
      />
    </div>
  );
});

UploadFile.displayName = 'UploadFile';

export default UploadFile;
