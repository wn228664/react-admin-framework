/**
 * 模块职责：让 Jest 能加载项目的 ES module 与 JSX，测试沿用真实源码而非复制实现。
 * preset-env 以当前 Node 测试运行时为目标，React 使用自动 JSX runtime；浏览器目标由 Umi 配置管理。
 * 此文件不注入接口凭证或修改业务参数，转译变动后需要重新执行全部测试。
 */
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
      },
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
  ],
};

// ───── 模块结束：babel.config.js ─────
