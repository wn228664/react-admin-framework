import { AxiosError } from 'axios';
import { createHttpClient } from '../request';

test('HTTP 200 does not override application payload failures', async () => {
  const client = createHttpClient({
    readToken: () => 'test-token',
    adapter: async (config) => {
      expect(config.headers.Authorization).toBe('Bearer test-token');
      return { data: { success: false }, status: 200, statusText: 'OK', headers: {}, config };
    },
  });
  await expect(client.get('/example')).resolves.toEqual({ success: false });
});

test('a response from an old session does not clear a newer token', async () => {
  let token = 'first';
  const onUnauthorized = jest.fn();
  const client = createHttpClient({
    readToken: () => token,
    onUnauthorized,
    adapter: async (config) => {
      token = 'second';
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401 });
    },
  });
  await expect(client.get('/example')).rejects.toThrow('Unauthorized');
  expect(onUnauthorized).not.toHaveBeenCalled();
});

test('a current 401 clears the token and rejects to the caller', async () => {
  const onUnauthorized = jest.fn();
  const client = createHttpClient({
    readToken: () => 'current',
    onUnauthorized,
    adapter: async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401 });
    },
  });
  await expect(client.get('/example')).rejects.toThrow('Unauthorized');
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});
