/**
 * 模块职责：根据当前 Dva 用户权限/角色快照决定局部内容是否展示。
 * 同时要求 permission 与 role 时两者都必须满足；各自数组要求采用命中任一项。
 * 没有要求时显示 children，未命中显示 noMatch；本地显隐不能代替服务端资源授权。
 */
// React Fragment 使权限占位不额外改变父容器布局。
/**
 * `React`：创建/识别 React 节点与 Fragment，复杂内容仍由当前组件声明，不执行未知字符串组件。
 */
import React from 'react';
// 从唯一 user model 订阅当前授权，避免按钮另外维护一份角色状态。
/**
 * `connect`：订阅唯一 Dva 模型并注入 dispatch，组件不另存模型字段的镜像。
 */
import { connect } from 'umi';
// 权限与角色的字符串清洗和通配规则在共享工具中收口。
/**
 * `hasPermission`：检查当前用户是否拥有指定权限。
 * `hasRole`：检查当前用户是否拥有指定角色。
 */
import { hasPermission, hasRole } from '@/utils/permission';
// 接口未就绪时把异常列表收窄为空数组，采用不可见的保守展示。
/**
 * `ensureArray`：为列表渲染取得数组引用，不把字符串、对象或空值包装成一项列表。
 */
import { ensureArray } from '@/utils/robust';
/**
 * 统一计算当前节点是否允许渲染。
 * @param {{ permission?: string | string[], role?: string | string[], userPermissions: string[], userRoles: string[] }} options 鉴权入参与当前用户授权信息
 * @returns {boolean} 允许渲染返回 true，否则返回 false
 */
const resolveAuthResult = ({
  /* `permission`：局部内容要求的权限字符串或数组，数组任一命中即可；未声明时跳过此类要求。 */ permission,
  /* `role`：局部内容要求的角色字符串或数组；与 permission 同时声明时两类都需通过。 */ role,
  /* `userPermissions`：当前账号的权限目录，来自唯一 user 模型；这里只读，不发请求。 */ userPermissions,
  /* `userRoles`：当前账号的角色目录；匹配规则由 hasRole 统一实现。 */ userRoles,
}) => {
  // 没有声明某一类要求时不参与该类匹配；两个都声明则按 AND 组合。
  const hasPermissionRequirement = Boolean(permission);
  // `hasRoleRequirement`：role 是否声明了角色要求；未声明时不参与 AND 判断，空数组按工具的保守规则处理。
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
const mapStateToProps = ({
  /* `user`：Dva 全局 user 模型快照；权限/角色缺失时投影为空数组，不复用旧账号状态。 */ user,
}) => {
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
const Auth = ({
  /* `children`：授权通过时展示的节点，不负责请求取消或服务端鉴权。 */ children,
  /* `permission`：当前组件的权限要求，原样交给统一 resolveAuthResult。 */ permission,
  /* `role`：当前组件的角色要求，两类要求同时存在时按 AND 组合。 */ role,
  /* `noMatch`：未授权时的替代节点，默认 null；不通过隐藏节点模拟真实服务授权。 */ noMatch = null,
  /* `userPermissions`：connect 注入的当前权限数组；不在组件中保存镜像状态。 */ userPermissions,
  /* `userRoles`：connect 注入的当前角色数组，账号变化后随 model 更新。 */ userRoles,
}) => {
  // 结果只用于渲染，业务请求仍须由服务端检查操作者权限。
  // `canRender`：当前权限与角色组合是否通过，仅决定节点显隐；服务端仍须验证真实资源授权。
  const canRender = resolveAuthResult({ permission, role, userPermissions, userRoles });

  return <>{canRender ? children : noMatch}</>;
};

export default connect(mapStateToProps)(Auth);

// ───── 模块结束：src/components/Authorized/index.jsx ─────
