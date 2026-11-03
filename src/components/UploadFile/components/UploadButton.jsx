import React from 'react';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';

const UploadButton = ({ loading, placeholder }) => {
  return (
    <div className="upload-button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>{placeholder}</div>
    </div>
  );
};

export default UploadButton;
