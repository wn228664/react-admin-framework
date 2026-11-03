import axios from 'axios';
import { getApiBaseUrl } from './robust';
import { getToken, removeToken } from './auth';

// 只处理 HTTP 传输。业务响应的成功码由接入方解释，不能把 HTTP 200 当成业务成功。
export function createHttpClient({
  baseURL = getApiBaseUrl(),
  readToken = getToken,
  onUnauthorized = removeToken,
  adapter,
} = {}) {
  const client = axios.create({ baseURL, timeout: 30000, adapter });
  client.interceptors.request.use((config) => {
    const token = readToken();
    config.sessionToken = token;
    if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(
    (response) => response.data,
    (error) => {
      if (error.response?.status === 401 && error.config?.sessionToken === readToken()) onUnauthorized();
      return Promise.reject(error);
    }
  );
  return client;
}

export default createHttpClient();
