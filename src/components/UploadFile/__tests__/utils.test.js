/**
 * @file src/components/UploadFile/__tests__/utils.test.js
 * @description UploadFile 纯逻辑工具的单元测试，覆盖 value 归一化、上传地址/请求头拼装和新增的预览/回填辅助函数。
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

describe('UploadFile utils', () => {
  test('normalizeValueToUrls', () => {
    expect(normalizeValueToUrls(undefined)).toEqual([]);
    expect(normalizeValueToUrls('')).toEqual([]);
    expect(normalizeValueToUrls('https://a.com/x.png')).toEqual(['https://a.com/x.png']);
    expect(normalizeValueToUrls(['', 'https://a.com/a.png', null, undefined, 'https://a.com/b.png'])).toEqual([
      'https://a.com/a.png',
      'https://a.com/b.png',
    ]);
  });

  test('getFileNameFromUrl', () => {
    expect(getFileNameFromUrl('')).toBe('未命名文件');
    expect(getFileNameFromUrl('https://a.com/path/a%20b.png?x=1')).toBe('a b.png');
  });

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

  test('createStableFileUid', () => {
    expect(createStableFileUid('https://a.com/a.png', 0)).toBe(createStableFileUid('https://a.com/a.png', 0));
    expect(createStableFileUid('https://a.com/a.png', 0)).not.toBe(createStableFileUid('https://a.com/a.png', 1));
    expect(createStableFileUid('https://a.com/a.png', 0)).not.toBe(createStableFileUid('https://a.com/b.png', 0));
  });

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

  test('resolveAcceptMimeTypes', () => {
    expect(resolveAcceptMimeTypes({ fileType: 'image' })).toEqual(expect.arrayContaining(['image/jpeg']));
    expect(resolveAcceptMimeTypes({ fileType: 'unknown' })).toEqual(expect.arrayContaining(['image/jpeg']));
    expect(resolveAcceptMimeTypes({ fileType: 'image', acceptTypes: ['image/png'] })).toEqual(['image/png']);
  });

  test('resolveAcceptAttr', () => {
    expect(resolveAcceptAttr({ fileType: 'image' })).toBe('image/*');
    expect(resolveAcceptAttr({ fileType: 'document' })).toBe('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv');
    expect(resolveAcceptAttr({ fileType: 'image', accept: '.png' })).toBe('.png');
  });

  test('collectUploadedUrls', () => {
    expect(
      collectUploadedUrls([
        { status: 'done', url: 'https://a.com/a.png' },
        { status: 'uploading', url: 'https://a.com/b.png' },
        { status: 'done', url: '' },
      ])
    ).toEqual(['https://a.com/a.png']);
  });

  test('getAcceptTypeLabel / resolvePreviewType', () => {
    expect(getAcceptTypeLabel('image', ['image/png'])).toBe('图片');
    expect(getAcceptTypeLabel('custom', ['application/json'])).toBe('application/json');
    expect(resolvePreviewType({ fileType: 'image', fileName: 'cover.anything' })).toBe('image');
    expect(resolvePreviewType({ fileType: 'file', fileName: 'demo.MP4' })).toBe('video');
    expect(resolvePreviewType({ fileType: 'file', fileName: 'demo.pdf' })).toBe('other');
  });

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
        dataTransform: (response) => response.custom,
      })
    ).toBe('https://a.com/c.png');

    expect(resolveUploadResponseErrorMessage({ code: 200, msg: 'ok' })).toBe('');
    expect(resolveUploadResponseErrorMessage({ code: 'OK' })).toBe('');
    expect(resolveUploadResponseErrorMessage({ ok: false }, (value) => value.ok || 'rejected')).toBe('rejected');
    expect(extractUrlFromUploadResponse({ response: { data: { id: 1 } } })).toBe('');
  });

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
