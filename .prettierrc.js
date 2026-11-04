/**
 * 模块职责：定义框架的可重复排版规则，供 format:check 与编辑器使用。
 * 120 列、2 空格、分号和 LF 只影响文本布局；依赖锁、生成物、图片与文档按 ignore 文件排除。
 * 格式检查不写文件，源码注释整理另以非注释 token 比对确认行为不变。
 */
module.exports = {
  // 一行最多 120 字符
  printWidth: 120,

  // 使用 2 个空格缩进
  tabWidth: 2,

  // 不使用缩进符，而使用空格
  useTabs: false,

  // 行尾需要有分号
  semi: true,

  // 使用单引号
  singleQuote: true,

  // 对象的 key 仅在必要时用引号
  quoteProps: 'as-needed',

  // jsx 不使用单引号，而使用双引号
  jsxSingleQuote: false,

  // ES5 允许的位置保留尾逗号，函数参数列表不强制增加。
  trailingComma: 'es5',

  // 大括号内的首尾需要空格
  bracketSpacing: true,

  // jsx 标签的反尖括号需要换行
  bracketSameLine: false,

  // 箭头函数，只有一个参数的时候，也需要括号
  arrowParens: 'always',

  // 每个文件格式化的范围是文件的全部内容
  rangeStart: 0,
  rangeEnd: Infinity,

  // 不需要写文件开头的 @prettier
  requirePragma: false,

  // 不需要自动在文件开头插入 @prettier
  insertPragma: false,

  // 保留文档已有段落换行，避免格式化源码时顺带重排说明文字。
  proseWrap: 'preserve',

  // 根据显示样式决定 html 要不要折行
  htmlWhitespaceSensitivity: 'css',

  // vue 文件中的 script 和 style 内不用缩进
  vueIndentScriptAndStyle: false,

  // 换行符使用 lf
  endOfLine: 'lf',

  // 格式化嵌入的内容
  embeddedLanguageFormatting: 'auto',

  // 不强制每个 HTML/Vue/JSX 属性单独占行，长标签按 printWidth 自动换行。
  singleAttributePerLine: false,
};

// ───── 模块结束：.prettierrc.js ─────
