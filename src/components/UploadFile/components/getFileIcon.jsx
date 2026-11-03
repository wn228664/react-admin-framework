import React from 'react';
import {
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { APP_TOKENS } from '@/styles/tokens';

export function getFileIcon(file) {
  const fileName = file?.name || '';
  const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

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
