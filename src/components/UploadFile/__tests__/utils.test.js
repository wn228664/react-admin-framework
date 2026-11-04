/**
 * 模块职责：直接测试真实上传 helper 的受控值、MIME/大小、来源授权、响应 URL 和列表终态规则。
 * 固定示例 URL/凭证都只是内存测试文本，不发请求；少量恶意协议夹具用于防止导航/下载安全边界退化。
 * 业务成功必须显式注入判定器，HTTP code 或文件扩展名不能被当作成功和内容真实性证明。
 */
/**
 * `buildUploadFileListWithResolvedUrl`：只更新目标文件的 url / thumbUrl，保持其他文件条目不变。
 * `buildUploadSizeErrorMessage`：生成文件大小校验失败提示文案。
 * `buildUploadTypeErrorMessage`：生成文件类型校验失败提示文案。
 * `buildUploadFileList`：把外部 value 归一化后的 URL 列表转换成 antd Upload 需要的 fileList。
 * `collectUploadedUrls`：收集已上传成功文件的 URL 列表，统一单文件/多文件回传口径。
 * `createStableFileUid`：把 URL 与列表索引组合成稳定 UI 身份，刷新受控值时尽量复用相同条目。
 * `extractUrlFromUploadResponse`：从上传响应中提取文件 URL，兼容 path 字符串、path 函数和常见后端响应兜底字段。
 * `getAcceptTypeLabel`：根据 fileType 与 MIME 配置生成用于错误提示的人类可读类型文案。
 * `getFileNameFromUrl`：从资源路径末段生成显示文件名，去掉查询串并尝试 URI 解码。
 * `normalizeValueToUrls`：把受控字符串/数组转成安全资源 URL 列表，忽略空值和不允许的协议。
 * `removeUploadFileByUid`：从 fileList 中移除指定 uid 的文件。
 * `removeUploadProgressByUid`：删除某个文件对应的上传进度记录。
 * `resolveAcceptAttr`：为文件选择器产生 accept 文本，显式非空 accept 优先。
 * `resolveAcceptMimeTypes`：优先使用显式 MIME 表，否则读取分类预设；file/all 分类不限制 MIME。
 * `resolvePreviewType`：根据组件配置与文件名推断预览类型。
 * `resolveUploadFileAsset`：从上传组件 file 对象里提取可复用的预览/下载目标数据。
 * `resolveUploadHeaders`：仅在明确上传目标与 API 基址同 origin 时自动附加应用 Bearer。
 * `resolveUploadResponseErrorMessage`：解析上传响应里的错误文案；返回空字符串代表可以继续走成功链路。
 * `resolveUploadUrl`：组合 API 基址与上传路径，明确的 HTTP(S) 目标保持原值。
 */
import {
  buildUploadFileListWithResolvedUrl,
  buildUploadSizeErrorMessage,
  buildUploadTypeErrorMessage,
  buildUploadFileList,
  collectUploadedUrls,
  createStableFileUid,
  extractUrlFromUploadResponse,
  getAcceptTypeLabel,
  getFileNameFromUrl,
  normalizeValueToUrls,
  removeUploadFileByUid,
  removeUploadProgressByUid,
  resolveAcceptAttr,
  resolveAcceptMimeTypes,
  resolvePreviewType,
  resolveUploadFileAsset,
  resolveUploadHeaders,
  resolveUploadResponseErrorMessage,
  resolveUploadUrl,
} from '@/components/UploadFile/utils';

describe('UploadFile utils', /**
 * 登记上传值、类型/大小提示、传输目标、响应解析和安全资源回填的纯规则，不能代替真实文件传输验收。
 * @returns {void}
 */ () => {
  /**
   * 单值/多值受控输入仅保留有效地址，空项和未知形状不能变成伪文件。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('normalizeValueToUrls', () => {
    expect(normalizeValueToUrls(undefined)).toEqual([]);
    expect(normalizeValueToUrls('')).toEqual([]);
    expect(normalizeValueToUrls('https://a.com/x.png')).toEqual(['https://a.com/x.png']);
    expect(normalizeValueToUrls(['', 'https://a.com/a.png', null, undefined, 'https://a.com/b.png'])).toEqual([
      'https://a.com/a.png',
      'https://a.com/b.png',
    ]);
  });

  /**
   * 文件名只取资源路径尾段并安全解码，查询串不应进入展示名称。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('getFileNameFromUrl', () => {
    expect(getFileNameFromUrl('')).toBe('未命名文件');
    expect(getFileNameFromUrl('https://a.com/path/a%20b.png?x=1')).toBe('a b.png');
  });

  /**
   * 有效 URL 构建稳定 done 条目，uid、名称和预览来源保持一致。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('buildUploadFileList', () => {
    expect(buildUploadFileList(['https://a.com/path/a.png'])).toEqual([
      {
        uid: createStableFileUid('https://a.com/path/a.png', 0),
        name: 'a.png',
        status: 'done',
        url: 'https://a.com/path/a.png',
        thumbUrl: 'https://a.com/path/a.png',
      },
    ]);
  });

  /**
   * 相同 URL 与索引生成相同 UI 身份，地址或位置变化必须可区分。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('createStableFileUid', () => {
    expect(createStableFileUid('https://a.com/a.png', 0)).toBe(createStableFileUid('https://a.com/a.png', 0));
    expect(createStableFileUid('https://a.com/a.png', 0)).not.toBe(createStableFileUid('https://a.com/a.png', 1));
    expect(createStableFileUid('https://a.com/a.png', 0)).not.toBe(createStableFileUid('https://a.com/b.png', 0));
  });

  /**
   * 相对上传路径正确拼 API 前缀，明确 HTTP(S) 地址保持宿主声明。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('resolveUploadUrl', () => {
    expect(resolveUploadUrl({ baseUrl: '/dev-api', uploadUrl: '/files' })).toBe('/dev-api/files');
    expect(resolveUploadUrl({ baseUrl: '/dev-api/', uploadUrl: 'files' })).toBe('/dev-api/files');
    expect(resolveUploadUrl({ baseUrl: 'https://api.example.com', uploadUrl: '/files' })).toBe(
      'https://api.example.com/files'
    );
    expect(resolveUploadUrl({ baseUrl: '/dev-api', uploadUrl: 'https://u.example.com/files' })).toBe(
      'https://u.example.com/files'
    );
  });

  /**
   * 自动 Bearer 与宿主显式头按正确优先级合并，显式 Authorization 保持控制权。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('resolveUploadHeaders', () => {
    expect(resolveUploadHeaders({ token: '', customHeaders: undefined })).toEqual({});
    expect(resolveUploadHeaders({ token: 'abc', customHeaders: undefined })).toEqual({ Authorization: 'Bearer abc' });
    expect(resolveUploadHeaders({ token: 'abc', customHeaders: { 'X-Trace': '1' } })).toEqual({
      Authorization: 'Bearer abc',
      'X-Trace': '1',
    });
    expect(resolveUploadHeaders({ token: 'abc', customHeaders: { Authorization: 'Bearer override' } })).toEqual({
      Authorization: 'Bearer override',
    });
  });

  /**
   * 未知 customRequest 或第三方上传目标不自动获得应用凭证，同 API 来源才允许注入。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('external uploads do not inherit the application bearer', () => {
    expect(resolveUploadHeaders({ token: 'private-fixture', apiBaseUrl: '/api', uploadUrl: '' })).toEqual({});
    expect(
      resolveUploadHeaders({
        token: 'private-fixture',
        apiBaseUrl: 'https://api.example.test/v1',
        uploadUrl: 'https://storage.example.test/upload',
        customHeaders: { 'X-Upload': 'fixture' },
      })
    ).toEqual({ 'X-Upload': 'fixture' });
    expect(
      resolveUploadHeaders({
        token: 'private-fixture',
        apiBaseUrl: 'https://api.example.test/v1',
        uploadUrl: 'https://api.example.test/v1/upload',
      })
    ).toEqual({ Authorization: 'Bearer private-fixture' });
    expect(
      resolveUploadHeaders({
        token: 'private-fixture',
        apiBaseUrl: '/api',
        uploadUrl: '/api/upload',
      })
    ).toEqual({ Authorization: 'Bearer private-fixture' });
  });

  /**
   * file/all 分类显式不限 MIME，自定义非空表优先，未知分类沿图片预设。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('resolveAcceptMimeTypes', () => {
    expect(resolveAcceptMimeTypes({ fileType: 'file' })).toBeNull();
    expect(resolveAcceptMimeTypes({ fileType: 'all' })).toBeNull();
    expect(resolveAcceptMimeTypes({ fileType: 'image' })).toEqual(expect.arrayContaining(['image/jpeg']));
    expect(resolveAcceptMimeTypes({ fileType: 'unknown' })).toEqual(expect.arrayContaining(['image/jpeg']));
    expect(resolveAcceptMimeTypes({ fileType: 'image', acceptTypes: ['image/png'] })).toEqual(['image/png']);
  });

  /**
   * 原生 accept 只提供选择器提示，显式文本优先；未知/原型属性名沿图片默认，类型文案只读取自身配置。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('resolveAcceptAttr', () => {
    expect(resolveAcceptAttr({ fileType: 'image' })).toBe('image/*');
    expect(resolveAcceptAttr({ fileType: 'document' })).toBe('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv');
    expect(resolveAcceptAttr({ fileType: 'image', accept: '.png' })).toBe('.png');
    // `type`：原型属性名夹具，不能被当成存在的 MIME 分类配置。
    for (const type of ['constructor', 'toString', '__proto__']) {
      expect(resolveAcceptAttr({ fileType: type })).toBe('image/*');
      expect(getAcceptTypeLabel(type, ['application/json'])).toBe('application/json');
    }
  });

  /**
   * 只回填完成且具有安全 URL 的文件，上传中和空地址不混入表单。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('collectUploadedUrls', () => {
    expect(
      collectUploadedUrls([
        { status: 'done', url: 'https://a.com/a.png' },
        { status: 'uploading', url: 'https://a.com/b.png' },
        { status: 'done', url: '' },
      ])
    ).toEqual(['https://a.com/a.png']);
  });

  /**
   * 类型文案与预览分支按配置和扩展名选择，不能被理解成真实内容验证。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('getAcceptTypeLabel / resolvePreviewType', () => {
    expect(getAcceptTypeLabel('image', ['image/png'])).toBe('图片');
    expect(getAcceptTypeLabel('custom', ['application/json'])).toBe('application/json');
    expect(resolvePreviewType({ fileType: 'image', fileName: 'cover.anything' })).toBe('image');
    expect(resolvePreviewType({ fileType: 'file', fileName: 'demo.MP4' })).toBe('video');
    expect(resolvePreviewType({ fileType: 'file', fileName: 'demo.pdf' })).toBe('other');
  });

  /**
   * MIME 白名单和 MiB 大小检查产生明确文案，有效文件返回空错误。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('buildUploadTypeErrorMessage / buildUploadSizeErrorMessage', () => {
    expect(
      buildUploadTypeErrorMessage({
        file: { type: 'image/png' },
        fileType: 'image',
        acceptMimeTypes: ['image/png'],
      })
    ).toBe('');
    expect(
      buildUploadTypeErrorMessage({
        file: { type: 'application/pdf' },
        fileType: 'image',
        acceptMimeTypes: ['image/png'],
      })
    ).toBe('只能上传 图片 格式的文件！');

    expect(buildUploadSizeErrorMessage({ file: { size: 1024 * 1024 }, maxSize: 2 })).toBe('');
    expect(buildUploadSizeErrorMessage({ file: { size: 3 * 1024 * 1024 }, maxSize: 2 })).toBe(
      '文件大小不能超过 2MB！当前文件大小: 3.00MB'
    );
  });

  /**
   * 预览/下载资产由同一 helper 规整，文件名缺失时从安全 URL 推断。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('resolveUploadFileAsset', () => {
    expect(
      resolveUploadFileAsset({
        file: { url: 'https://a.com/path/demo.pdf' },
        fileType: 'file',
      })
    ).toEqual({
      fileUrl: 'https://a.com/path/demo.pdf',
      fileName: 'demo.pdf',
      previewType: 'other',
    });
  });

  /**
   * 响应解析优先遵循显式路径/转换函数，业务拒绝由同步判定器明确返回。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('extractUrlFromUploadResponse / resolveUploadResponseErrorMessage', () => {
    expect(
      extractUrlFromUploadResponse({
        response: { data: { link: 'https://a.com/a.png' } },
      })
    ).toBe('https://a.com/a.png');
    expect(
      extractUrlFromUploadResponse({
        response: { payload: { file: 'https://a.com/b.png' } },
        dataPath: 'payload.file',
      })
    ).toBe('https://a.com/b.png');
    expect(
      extractUrlFromUploadResponse({
        response: { custom: 'https://a.com/c.png' },
        dataTransform: (
          /* `response`：函数式 dataTransform 接收的响应夹具，按 custom 字段提取后仍须通过资源协议校验。 */ response
        ) => response.custom,
      })
    ).toBe('https://a.com/c.png');

    expect(resolveUploadResponseErrorMessage({ code: 200, msg: 'ok' })).toBe('');
    expect(resolveUploadResponseErrorMessage({ code: 'OK' })).toBe('');
    expect(
      resolveUploadResponseErrorMessage(
        { ok: false },
        (/* `value`：显式业务判定器接收的当前响应，只认可其 ok，否则返回公开拒绝文案。 */ value) =>
          value.ok || 'rejected'
      )
    ).toBe('rejected');
    expect(extractUrlFromUploadResponse({ response: { data: { id: 1 } } })).toBe('');
  });

  /**
   * 可执行和本地文件协议经过所有资源消费入口都被拒绝，合法相对/Blob 地址仍可使用。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('upload values and response transforms reject executable resource protocols', () => {
    // `url`：当前明确拒绝的可执行/本地文件资源协议夹具，所有 URL 消费入口都应返回空值。
    for (const url of ['javascript:alert(1)', 'data:text/html,<script>fixture</script>', 'file:///tmp/fixture']) {
      expect(normalizeValueToUrls(url)).toEqual([]);
      expect(extractUrlFromUploadResponse({ response: { url }, dataPath: 'url' })).toBe('');
      expect(
        extractUrlFromUploadResponse({
          response: {},
          dataTransform: /**
           * 模拟宿主解析器返回当前非法 URL，验证自定义转换同样经过协议检查，不能绕过安全资源边界。
           * @returns {string}
           */ () => url,
        })
      ).toBe('');
      expect(resolveUploadFileAsset({ file: { url }, fileType: 'file' }).fileUrl).toBe('');
    }
    expect(normalizeValueToUrls('/files/image.png')).toEqual(['/files/image.png']);
    expect(normalizeValueToUrls('blob:https://example.test/fixture')).toEqual(['blob:https://example.test/fixture']);
  });

  /**
   * 移除、完成 URL 回填与进度删除只影响目标 uid，保持其它并发项原值。
   * @returns {void} 由 Jest 同步执行断言；故障输入和预期边界由本例夹具限定。
   */
  test('removeUploadFileByUid / buildUploadFileListWithResolvedUrl / removeUploadProgressByUid', () => {
    expect(
      removeUploadFileByUid(
        [
          { uid: '1', url: 'https://a.com/a.png' },
          { uid: '2', url: 'https://a.com/b.png' },
        ],
        '1'
      )
    ).toEqual([{ uid: '2', url: 'https://a.com/b.png' }]);

    expect(
      buildUploadFileListWithResolvedUrl(
        [
          { uid: '1', url: '', thumbUrl: '' },
          { uid: '2', url: 'https://a.com/b.png', thumbUrl: 'https://a.com/b.png' },
        ],
        '1',
        'https://a.com/a.png'
      )
    ).toEqual([
      { uid: '1', url: 'https://a.com/a.png', thumbUrl: 'https://a.com/a.png' },
      { uid: '2', url: 'https://a.com/b.png', thumbUrl: 'https://a.com/b.png' },
    ]);

    expect(removeUploadProgressByUid({ a: 10, b: 20 }, 'a')).toEqual({ b: 20 });
  });
});

// ───── 模块结束：src/components/UploadFile/__tests__/utils.test.js ─────
