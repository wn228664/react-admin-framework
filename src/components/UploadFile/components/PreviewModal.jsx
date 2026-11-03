import React from 'react';
import AdminModal from '../../AdminModal';

const PreviewModal = ({ open, title, type, src, onCancel }) => {
  return (
    <AdminModal open={open} title={title} footer={null} onCancel={onCancel} width={800} centered destroyOnHidden>
      {type === 'image' ? (
        <img alt="preview" style={{ width: '100%', maxHeight: '65dvh', objectFit: 'contain' }} src={src} />
      ) : type === 'video' ? (
        <video controls style={{ width: '100%', maxHeight: '65dvh', objectFit: 'contain' }} src={src} autoPlay />
      ) : null}
    </AdminModal>
  );
};

export default PreviewModal;
