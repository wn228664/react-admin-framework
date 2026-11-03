/**
 * @file src/utils/permission.js
 * @description 权限校验工具，负责统一处理权限点和角色的命中判断，兼容超级管理员通配符与异常类型兜底。
 * @example `hasPermission(user.permissions, 'system:user:add')` 会在用户拥有该权限或通配符权限时返回 `true`。
 */
import { ensureArray } from '@/utils/robust';
const SUPER_ADMIN_PERMISSION = '*:*:*';
const SUPER_ADMIN_ROLE = 'admin';

/**
 * 归一化权限/角色源列表，只保留非空字符串，避免后续判断收到脏值。
 * @param {*} source 原始权限或角色数据
 * @returns {string[]} 可安全参与 includes/some 判断的字符串列表
 */
const normalizeAccessSource = (source) => {
  return ensureArray(source).filter((item) => typeof item === 'string' && item.trim() !== '');
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
    return ensureArray(target).some((item) => typeof item === 'string' && sourceList.includes(item));
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
  const roleList = normalizeAccessSource(roles);

  if (!roleList.length) {
    return false;
  }

  if (roleList.includes(SUPER_ADMIN_ROLE)) {
    return true;
  }

  return matchAccessTarget(roleList, role);
}
