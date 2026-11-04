/**
 * 模块职责：按显示文件名的扩展名选择默认图标，供无法直接显示缩略图的列表项复用。
 * 这只是视觉分类，不证明 MIME、内容或服务器文件类型；未知扩展名使用普通文件图标。
 */
// React 创建图标节点，不在这里读取文件内容或发网络请求。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// 文件类别只映射到这组预设图标；扩展名不参与动态组件解析，也不是实际内容类型证明。
/**
 * `FileExcelOutlined`：表格文档分类的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `FileImageOutlined`：图片文件分类的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `FileOutlined`：未知文件分类的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `FilePdfOutlined`：PDF 文件分类的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `FileTextOutlined`：文本文件分类的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `FileWordOutlined`：Word 文档分类的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 * `VideoCameraOutlined`：视频文件分类的视觉图标；操作许可仍由当前组件控制，图标不能替代可访问名称。
 */
import {
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
// 主要图标颜色沿用框架语义 token，避免局部品牌色漂移。
/**
 * `APP_TOKENS`：JS 侧语义色/空间/材质配置，局部显示不从业务品牌字段推导。
 */
import { APP_TOKENS } from '@/styles/tokens';

/**
 * 按 file.name 末段扩展名选择图片、视频、文档或默认图标。
 * @param {Object} file 当前 UI 文件条目，name 缺失时走普通文件图标。
 * @returns {React.ReactElement} 仅用于预览占位，不代表文件内容已经验证。
 */
export function getFileIcon(file) {
  // `fileName`：file.name 或空串的显示名；只读后缀，不读取磁盘或实际 MIME。
  const fileName = file?.name || '';
  // 仅显示用途的扩展名，统一小写；不能拿它替代上传安全校验。
  // `fileExt`：从最后一个点截取并转小写的显示后缀；未知后缀使用普通文件图标。
  const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

  // 每份调用返回对应图标节点，分类样式不改变文件本身或下载动作。
  // `iconMap`：本次调用构造的分类图标节点表，主要色使用 APP_TOKENS；不通过文件名动态加载模块。
  const iconMap = {
    image: <FileImageOutlined style={{ fontSize: 40, color: APP_TOKENS.colors.primary }} />,
    video: <VideoCameraOutlined style={{ fontSize: 40, color: '#722ed1' }} />,
    pdf: <FilePdfOutlined style={{ fontSize: 40, color: '#f5222d' }} />,
    word: <FileWordOutlined style={{ fontSize: 40, color: APP_TOKENS.colors.primary }} />,
    excel: <FileExcelOutlined style={{ fontSize: 40, color: '#52c41a' }} />,
    text: <FileTextOutlined style={{ fontSize: 40, color: '#faad14' }} />,
    default: <FileOutlined style={{ fontSize: 40, color: '#8c8c8c' }} />,
  };

  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(fileExt)) {
    return iconMap.image;
  }
  if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(fileExt)) {
    return iconMap.video;
  }
  if (['.pdf'].includes(fileExt)) {
    return iconMap.pdf;
  }
  if (['.doc', '.docx'].includes(fileExt)) {
    return iconMap.word;
  }
  if (['.xls', '.xlsx', '.csv'].includes(fileExt)) {
    return iconMap.excel;
  }
  if (['.txt'].includes(fileExt)) {
    return iconMap.text;
  }

  return iconMap.default;
}

// ───── 模块结束：src/components/UploadFile/components/getFileIcon.jsx ─────
