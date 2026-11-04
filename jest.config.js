/**
 * 模块职责：定义纯逻辑测试的 Node 环境、源码测试入口、@ 别名和 Babel 转译。
 * 每例清理 mock 调用记录；用例替换 DOM/存储对象时仍须自己恢复全局值。
 * Node 单测不等于真实浏览器滚动/焦点验收，组件关键路径需补运行态检查。
 */
module.exports = {
  // 纯规则、传输适配器和受控平台替身在 Node 运行，不冒充 DOM 布局引擎。
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.js'],
  // 测试中的 @ 指向实际 src，与应用同源，避免测试悄悄覆盖复制的旧模块。
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  clearMocks: true,
};

// ───── 模块结束：jest.config.js ─────
