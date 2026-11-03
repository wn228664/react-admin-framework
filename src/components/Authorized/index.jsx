/**
 * @file src/components/Authorized/index.jsx
 * @description 权限控制组件，根据全局用户权限/角色决定子节点是否渲染，供页面按钮、操作列和局部内容做显隐治理。
 * @example `<Auth permission="system:user:add"><Button>新增</Button></Auth>`。
 */
import React from 'react';
import { connect } from 'umi';
import { hasPermission, hasRole } from '@/utils/permission';
import { ensureArray } from '@/utils/robust';
/**
 * 统一计算当前节点是否允许渲染。
 * @param {{ permission?: string | string[], role?: string | string[], userPermissions: string[], userRoles: string[] }} options 鉴权入参与当前用户授权信息
 * @returns {boolean} 允许渲染返回 true，否则返回 false
 */
const resolveAuthResult = ({ permission, role, userPermissions, userRoles }) => {
  const hasPermissionRequirement = Boolean(permission);
  const hasRoleRequirement = Boolean(role);

  if (!hasPermissionRequirement && !hasRoleRequirement) {
    return true;
  }

  if (hasPermissionRequirement && !hasPermission(userPermissions, permission)) {
    return false;
  }

  if (hasRoleRequirement && !hasRole(userRoles, role)) {
    return false;
  }

  return true;
};

/**
 * 把 user model 中的权限与角色投影成组件 props。
 * @param {{ user?: { permissions?: unknown, roles?: unknown } }} state 全局状态
 * @returns {{ userPermissions: string[], userRoles: string[] }} 归一化后的授权信息
 */
const mapStateToProps = ({ user }) => {
  return {
    userPermissions: ensureArray(user?.permissions, []),
    userRoles: ensureArray(user?.roles, []),
  };
};
/**
 * 权限控制组件。
 * @param {{ children: React.ReactNode, permission?: string | string[], role?: string | string[], noMatch?: React.ReactNode, userPermissions: string[], userRoles: string[] }} props 组件 props
 * @returns {JSX.Element} 授权通过时渲染 children，否则渲染 noMatch
 */
const Auth = ({ children, permission, role, noMatch = null, userPermissions, userRoles }) => {
  const canRender = resolveAuthResult({ permission, role, userPermissions, userRoles });

  return <>{canRender ? children : noMatch}</>;
};

export default connect(mapStateToProps)(Auth);
