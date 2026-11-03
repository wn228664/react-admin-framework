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
  globals: {
    // 全局 logger 对象
    logger: 'readonly',
  },
  rules: {
    // React 17+ 不需要显式导入 React
    'react/react-in-jsx-scope': 'off',
    // 允许使用 PropTypes
    'react/prop-types': 'off',
    // 允许未使用的变量（以下划线开头）
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // 禁止 console（使用 logger 代替）
    'no-console': ['error', { allow: ['warn', 'error'] }],
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
