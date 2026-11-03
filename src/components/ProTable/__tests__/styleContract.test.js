/**
 * @file src/components/ProTable/__tests__/styleContract.test.js
 * @description ProTable 横向滚动合同测试，防止宽表格在窄屏下失去底部滚动条。
 */
const fs = require('fs');
const path = require('path');

const componentSource = fs.readFileSync(path.resolve(__dirname, '../index.jsx'), 'utf8');
const styleSource = fs.readFileSync(path.resolve(__dirname, '../index.less'), 'utf8');

describe('ProTable scroll style contract', () => {
  test('defaults horizontal scroll to max-content when caller does not provide scroll.x', () => {
    expect(componentSource).toContain("externalScroll?.x !== undefined ? externalScroll.x : 'max-content'");
  });

  test('allows the table body to scroll in both directions', () => {
    expect(styleSource).toMatch(/\.ant-table-body\s*\{[\s\S]*overflow:\s*auto !important;/);
    expect(styleSource).toContain('scrollbar-gutter: stable');
    expect(styleSource).toMatch(/\.ant-table-body::-webkit-scrollbar\s*\{[\s\S]*height:\s*10px;/);
  });
});
