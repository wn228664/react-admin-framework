/**
 * 模块职责：为框架源码与 Jest 测试提供一致的静态检查，补充 React Hook 依赖和未使用声明约束。
 * npm run lint 对 warning 也失败；例外仅限统一日志模块和测试环境全局，不以禁用规则掩盖运行问题。
 * 项目自有代码使用 JS/JSX；这里不建立 TypeScript 转译或服务端接口校验。
 */
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // React 17+ 不需要显式导入 React
    'react/react-in-jsx-scope': 'off',
    // 允许使用 PropTypes
    'react/prop-types': 'off',
    // 允许未使用的变量（以下划线开头）
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // 应用诊断必须显式导入 logger；只有该模块可以直接写 console，避免生产错误绕开统一入口。
    'no-console': 'error',
  },
  overrides: [
    {
      // logger.js 允许使用 console
      files: ['src/utils/logger.js'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Jest 测试文件使用 describe/test/expect 等全局变量
      files: ['src/**/__tests__/**/*.test.js'],
      env: {
        jest: true,
      },
    },
  ],
};

// ───── 模块结束：.eslintrc.js ─────
