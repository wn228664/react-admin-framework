/**
 * 模块职责：区分外部协议目标并解析框架刷新中转的站内恢复地址。
 * 协议形状不证明目标可信；刷新目标只允许本地路径，不负责菜单权限或后端授权。
 */
/**
 * 判断 path 是否以受支持的外部协议开头，大小写不敏感；空值先转为空串。
 * @param {*} path 菜单配置中的目标文本。
 * @returns {boolean} true 表示按外链处理，不代表地址已经通过安全校验。
 */
export function isExternalPath(path) {
  return /^(https?:|mailto:|tel:)/i.test(String(path ?? ''));
}

/**
 * 从保留的 /redirect/* 中转路径中还原待刷新的站内页面，拒绝递归或来源歧义。
 * @param {Object} location 浏览器位置快照，只接受字符串字段，不转换任意对象。
 * @param {string} location.pathname 必须以 /redirect/ 开始，后缀为单斜杠开头的本地路径。
 * @param {string} [location.search=""] 原查询串，非空时必须以 ? 开头；不得放入认证秘密。
 * @param {string} [location.hash=""] 原片段，非空时必须以 # 开头。
 * @returns {string} 本地完整路径；无效输入统一回框架首页 /dashboard，不抛 URL 解析异常。
 * 返回原查询与片段；它只限定来源和刷新递归，未知站内页面仍交路由 404 处理。
 */
export function resolveRefreshTarget({ pathname, search = '', hash = '' } = {}) {
  // prefix：框架保留的中转前缀；配置测试同时核对真实路由表，避免刷新入口与解析规则漂移。
  const prefix = '/redirect';
  if (
    typeof pathname !== 'string' ||
    typeof search !== 'string' ||
    typeof hash !== 'string' ||
    !pathname.startsWith(`${prefix}/`) ||
    /[?#]/.test(pathname) ||
    /[\\\s\p{Cc}]/u.test(pathname + search + hash) ||
    (search && !search.startsWith('?')) ||
    (hash && !hash.startsWith('#'))
  )
    return '/dashboard';
  // target：剥除中转前缀后的原站内路径；保留编码和查询语义，拒绝协议相对地址。
  const target = pathname.slice(prefix.length);
  if (!target.startsWith('/') || target.startsWith('//')) return '/dashboard';
  try {
    // normalizedPath：URL 标准化点段后的路径，只用于排除绕回 /redirect 的递归，不改变返回编码。
    const normalizedPath = new URL(target, 'https://framework.invalid').pathname;
    if (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)) return '/dashboard';
    return target + search + hash;
  } catch {
    return '/dashboard';
  }
}

// ───── 模块结束：src/utils/nav.js ─────
