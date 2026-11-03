/**
 * @file src/utils/auth.js
 * @description Token 管理工具，封装登录凭证的 Cookie 读写操作，提供获取、设置、移除 Token 的方法，异常时静默处理避免影响页面。
 */

import Cookies from 'js-cookie';

const TokenKey = 'framework-Admin-Token';

/**
 * 获取 Token
 */
export function getToken() {
  try {
    return Cookies.get(TokenKey);
  } catch (error) {
    return undefined;
  }
}

/**
 * 设置 Token
 */
export function setToken(token) {
  try {
    Cookies.set(TokenKey, token);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 移除 Token
 */
export function removeToken() {
  try {
    Cookies.remove(TokenKey);
    return true;
  } catch (error) {
    return false;
  }
}
