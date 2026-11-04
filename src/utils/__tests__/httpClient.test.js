/**
 * `AxiosError`：构造可识别的路径/会话错误，保留 code 供调用方分派，不直接记录原始 config。
 */
/**
 * 模块职责：用注入的 Axios adapter 验证可信来源、凭证注入、会话代次和旧响应隔离。
 * 所有传输都在内存中完成，测试 URL 和 token 是固定夹具，不读取真实会话或连接服务器。
 * HTTP 200 只交付原始业务载荷；公开请求不读取应用凭证，旧会话 401 不能撤销新会话。
 */
import { AxiosError } from 'axios';
/**
 * `createHttpClient`：创建一个 API 来源固定的 Axios 实例，默认超时 30000 毫秒。
 */
import { createHttpClient } from '../request';

/**
 * HTTP 200 原样交付 success=false 载荷，由服务契约判断业务结果。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('HTTP 200 does not override application payload failures', async () => {
  // `client`：带固定测试凭证与内存 adapter 的实例，用于验证 HTTP 成功不会覆盖业务失败载荷。
  const client = createHttpClient({
    readToken: /**
     * 提供本例固定凭证，便于验证真实请求拦截器只向约定目标写入 Bearer；不是实际用户密钥。
     * @returns {string}
     */ () => 'test-token',
    adapter: async (/* `config`：真实请求拦截器交给 adapter 的配置，检查自动 Bearer 后返回业务失败载荷。 */ config) => {
      expect(config.headers.Authorization).toBe('Bearer test-token');
      return { data: { success: false }, status: 200, statusText: 'OK', headers: {}, config };
    },
  });
  await expect(client.get('/example')).resolves.toEqual({ success: false });
});

/**
 * 请求开始后会话已切换，旧 401 不得删除新账号凭证。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('a response from an old session does not clear a newer token', async () => {
  // `token`：模拟第一次请求后被替换的会话值，adapter 内改成 second 以制造旧会话 401。
  let token = 'first';
  // `onUnauthorized`：旧 401 场景的清理观察者，预期不被调用以保护新会话。
  const onUnauthorized = jest.fn();
  // `client`：旧会话失败实例，开始和失败时读取同一可变 token 闭包。
  const client = createHttpClient({
    readToken: /**
     * 读取可变 token 夹具，使真实响应拦截器能观察 adapter 期间发生的账号切换。
     * @returns {string}
     */ () => token,
    onUnauthorized,
    adapter: async (
      /* `config`：旧会话 401 的真实请求配置，绑定原凭证快照并构造带 config 的 AxiosError。 */ config
    ) => {
      token = 'second';
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401 });
    },
  });
  await expect(client.get('/example')).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
  expect(onUnauthorized).not.toHaveBeenCalled();
});

/**
 * 当前认证请求的真实 401 触发一次清理并继续向调用方拒绝。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('a current 401 clears the token and rejects to the caller', async () => {
  // `onUnauthorized`：当前会话 401 场景的清理观察者，必须恰好调用一次。
  const onUnauthorized = jest.fn();
  // `client`：始终读取 current 凭证的实例，adapter 拒绝 401 验证真实未授权分派。
  const client = createHttpClient({
    readToken: /**
     * 提供当前会话固定凭证，验证当前 401 才调用 onUnauthorized，不混入旧会话场景。
     * @returns {string}
     */ () => 'current',
    onUnauthorized,
    adapter: async (/* `config`：当前 401 的配置，供错误分派识别这是本实例拥有的认证请求。 */ config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401 });
    },
  });
  await expect(client.get('/example')).rejects.toThrow('Unauthorized');
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

/**
 * 认证外链、协议相对地址、反斜杠和 baseURL 覆盖在到达 adapter 前被拒绝。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('authenticated requests reject external targets and base overrides before transport', async () => {
  // `adapter`：非法来源场景的传输观察者；来源或基址违规应在到达它之前拒绝。
  const adapter = jest.fn(
    async (/* `config`：非法来源本不应到达的传输配置，adapter 被调用即表示来源门禁失效。 */ config) => ({
      data: 'unexpected',
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })
  );
  // `client`：固定 /api 基址与测试凭证的实例，验证单请求不能替换目标来源。
  const client = createHttpClient({
    baseURL: '/api',
    readToken: /**
     * 提供固定夹具凭证，验证外链/协议相对/反斜杠目标在 adapter 执行前被拒绝。
     * @returns {string}
     */ () => 'fixture',
    adapter,
  });
  // `path`：当前非法认证目标，覆盖绝对外链、协议相对地址和反斜杠歧义。
  for (const path of ['https://outside.example.test/file', '//outside.example.test/file', '/bad\\path']) {
    await expect(client.get(path)).rejects.toMatchObject({ code: 'INVALID_PATH' });
  }
  await expect(client.get('/items', { baseURL: 'https://outside.example.test' })).rejects.toMatchObject({
    code: 'INVALID_PATH',
  });
  expect(adapter).not.toHaveBeenCalled();
});

/**
 * 旧会话即使 HTTP 成功也不得把业务数据交给新会话消费者。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('a successful response from an old session is rejected before consumer delivery', async () => {
  // `token`：成功回包场景的可变会话值，adapter 内切换后旧业务数据应被拒绝交付。
  let token = 'first';
  // `client`：旧会话成功响应实例，证明状态码正常也不能跨账号消费。
  const client = createHttpClient({
    readToken: /**
     * 读取可变会话凭证，验证成功响应返回前换账号也必须被标记为过期结果。
     * @returns {string}
     */ () => token,
    adapter: async (/* `config`：旧会话成功响应的请求快照，返回前改变 token 制造迟到结果。 */ config) => {
      token = 'second';
      return { data: { owner: 'first' }, status: 200, statusText: 'OK', headers: {}, config };
    },
  });
  await expect(client.get('/items')).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
});

/**
 * 凭证文本不变但会话代次变化时，旧结果仍必须返回 SESSION_CHANGED。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('a repeated token still invalidates responses when its session revision changes', async () => {
  // `revision`：模拟同 token 下重新建立会话的代次，adapter 内递增而凭证文本不变。
  let revision = 0;
  // `client`：固定 token、可变 revision 的实例，验证身份不能只比较凭证文本。
  const client = createHttpClient({
    readToken: /**
     * 保持 token 文本恒定，仅通过 revision 变化模拟同 token 重新登录，避免只按文本判会话身份。
     * @returns {string}
     */ () => 'unchanged-fixture',
    readRevision: /**
     * 读取本例当前会话代次，adapter 递增后旧成功响应必须拒绝，不向调用者交付。
     * @returns {number}
     */ () => revision,
    adapter: async (/* `config`：同 token 场景的请求快照，代次改变后其结果必须失效。 */ config) => {
      revision++;
      return { data: 'previous-session', status: 200, statusText: 'OK', headers: {}, config };
    },
  });
  await expect(client.get('/items')).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
});

/**
 * 公开请求不读取自动凭证，其目标 401 也不能撤销应用会话。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('explicit public requests neither read application credentials nor clear its session', async () => {
  // `readToken`：公开请求的凭证读取观察者，应完全不被调用，避免无意访问应用会话。
  const readToken = jest.fn(() => 'private-fixture');
  // `onUnauthorized`：公开目标 401 的应用清理观察者，应保持未调用。
  const onUnauthorized = jest.fn();
  // `client`：显式 authenticated=false 的公开传输实例，不注入 Bearer 或撤销应用会话。
  const client = createHttpClient({
    readToken,
    onUnauthorized,
    adapter: async (/* `config`：公开目标的传输配置，检查没有自动 Authorization 后模拟目标自己的 401。 */ config) => {
      expect(config.headers.Authorization).toBeUndefined();
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401 });
    },
  });
  await expect(client.get('https://public.example.test/file', { authenticated: false })).rejects.toThrow(
    'Unauthorized'
  );
  expect(readToken).not.toHaveBeenCalled();
  expect(onUnauthorized).not.toHaveBeenCalled();
});

// ───── 模块结束：src/utils/__tests__/httpClient.test.js ─────
