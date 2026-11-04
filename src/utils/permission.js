/**
 * 模块职责：把当前权限/角色快照与组件要求做本地匹配，供 Authorized 控制入口展示。
 * 数组要求采用“命中任一项”；权限 *:*:* 和角色 admin 为显式超级权限约定。
 * 这层只影响界面，服务端必须独立执行资源授权；非字符串来源会先被过滤。
 */
// 复用数组类型收窄，避免未初始化用户快照导致权限判断抛错。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 */
import { ensureArray } from '@/utils/robust';
// 接入方显式授予的全权限标记；不从用户输入或路由参数推断。
const SUPER_ADMIN_PERMISSION = '*:*:*';
// 角色全匹配标记与权限通配符分开，不因普通角色名相近而放行。
const SUPER_ADMIN_ROLE = 'admin';

/**
 * 归一化权限/角色源列表，只保留非空字符串，避免后续判断收到脏值。
 * @param {*} source 原始权限或角色数据
 * @returns {string[]} 可安全参与 includes/some 判断的字符串列表
 */
const normalizeAccessSource = (source) => {
  return ensureArray(source).filter(
    (/* `item`：当前源权限/角色条目；仅保留非空字符串，不修改原字符串或原数组。 */ item) =>
      typeof item === 'string' && item.trim() !== ''
  );
};

/**
 * 判断目标权限/角色是否命中源列表。
 * @param {string[]} sourceList 当前用户拥有的权限/角色列表
 * @param {string | string[]} target 目标权限/角色
 * @returns {boolean} 命中返回 true，否则返回 false
 */
const matchAccessTarget = (sourceList, target) => {
  if (typeof target === 'string') {
    return sourceList.includes(target);
  }

  if (Array.isArray(target)) {
    return ensureArray(target).some(
      (/* `item`：数组形式的目标要求；当前回调逐项判断字符串是否被当前源列表显式包含。 */ item) =>
        typeof item === 'string' && sourceList.includes(item)
    );
  }

  return false;
};
/**
 * 检查当前用户是否拥有指定权限。
 * @param {*} permissions 用户权限源，允许直接传入未清洗的接口/状态值
 * @param {string | string[]} permission 目标权限点；数组时表示满足任一项即可
 * @returns {boolean} 命中权限或超级管理员通配符时返回 true
 */
export function hasPermission(permissions, permission) {
  // `permissionList`：从当前用户快照筛出的非空字符串权限列表；全权限标记仅在该列表明确存在时生效。
  const permissionList = normalizeAccessSource(permissions);

  if (!permissionList.length) {
    return false;
  }

  if (permissionList.includes(SUPER_ADMIN_PERMISSION)) {
    return true;
  }

  return matchAccessTarget(permissionList, permission);
}

/**
 * 检查当前用户是否拥有指定角色。
 * @param {*} roles 用户角色源，允许直接传入未清洗的接口/状态值
 * @param {string | string[]} role 目标角色；数组时表示满足任一项即可
 * @returns {boolean} 命中角色或超级管理员角色时返回 true
 */
export function hasRole(roles, role) {
  // `roleList`：从当前用户快照筛出的角色字符串；为空时直接拒绝，不根据路由或账号名称推断角色。
  const roleList = normalizeAccessSource(roles);

  if (!roleList.length) {
    return false;
  }

  if (roleList.includes(SUPER_ADMIN_ROLE)) {
    return true;
  }

  return matchAccessTarget(roleList, role);
}

// ───── 模块结束：src/utils/permission.js ─────
