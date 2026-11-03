import React from 'react';
import './index.less';

/** 页面只分配剩余空间；滚动必须交给子组件的 body，避免把操作区卷出视口。 */
export default function PageContainer({ title, extra, children }) {
  return (
    <section className="page-container">
      {(title || extra) && (
        <header className="page-container-header">
          <h1>{title}</h1>
          <div>{extra}</div>
        </header>
      )}
      <div className="page-container-body">{children}</div>
    </section>
  );
}
