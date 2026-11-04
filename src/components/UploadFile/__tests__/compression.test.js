/**
 * `Blob`：Node 提供的浏览器兼容二进制容器，仅用于构造测试编码结果，不读取实际文件系统。
 * `File`：Node 提供的浏览器兼容文件对象，用明确 MIME/文件名构造压缩边界夹具。
 */
/**
 * 模块职责：用可控 FileReader/Image/canvas 替身验证压缩类型、格式回退、尺寸参数与失败收口。
 * 所有二进制均为内存夹具，不读取真实图片；微任务模拟解码完成，不能代替浏览器编解码质量验收。
 * 每例恢复原平台全局对象，避免前一用例的画布/图像状态污染下一例。
 */
import { Blob, File } from 'node:buffer';
/**
 * `compressImage`：缩小 JPEG/PNG/WebP 静态图，按浏览器实际 MIME 命名；GIF/SVG 保留，失败拒绝给上传 owner。
 */
import { compressImage } from '../components/compressImage';

// `original`：测试开始前的平台全局属性值快照；afterEach 恢复原值或删除原本不存在的属性。
const original = { FileReader: global.FileReader, Image: global.Image, document: global.document };
// `context`：当前用例独立的 2D 画布替身；drawImage 可注入失败，null 表示浏览器拒绝创建上下文。
let context;
beforeEach(
  /**
   * 每例重建读取器、图像与 canvas 平台替身，使真实压缩函数在固定微任务顺序下运行；不访问磁盘或真实图像解码。
   * @returns {void}
   */ () => {
    context = { drawImage: jest.fn() };
    /** 读取器替身：不读磁盘，在下一微任务返回固定 data URL，使真实压缩函数继续进入解码。 */
    global.FileReader = class {
      /** 排队模拟读取完成；真实异常/取消由其它故障夹具检查，返回 void。 */
      readAsDataURL() {
        queueMicrotask(() => this.onload?.({ target: { result: 'data:image/webp;base64,Zml4dHVyZQ==' } }));
      }
    };
    /** 图像解码替身：使用固定宽高，赋 src 后排队 onload；每例重建避免旧回调串扰。 */
    global.Image = class {
      // width：固定原图宽 320 像素，供真实缩放逻辑计算比例。
      width = 320;
      // height：固定原图高 160 像素，与宽度一起验证目标边长约束。
      height = 160;
      /** 接收读取器 data URL 并异步模拟解码完成；该 setter 不解析真实图像内容。 */
      set src(/* `_value`：图像替身接收的 data URL，本测试不解析正文，只用微任务触发 onload。 */ _value) {
        queueMicrotask(() => this.onload?.());
      }
    };
    global.document = {
      createElement: /**
       * 模拟创建 canvas，提供绘制上下文和固定 PNG 编码回调，专门验证浏览器格式回退时的 MIME/扩展名一致性。
       * @returns {Object} 当前例的 canvas 替身。
       */ () => ({
        getContext: /**
         * 返回本例共享的绘制上下文，便于单例注入 drawImage 故障，不生成真实 GPU/canvas 资源。
         * @returns {Object}
         */ () => context,
        toBlob: (/* `done`：canvas.toBlob 完成回调，替身固定返回 PNG，专门模拟格式回退。 */ done) =>
          done(new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' })),
      }),
    };
  }
);
afterEach(
  /**
   * 按测试前快照恢复 FileReader、Image 和 document，原来不存在的属性删除，防止后续用例沿用本例平台替身。
   * @returns {void}
   */ () => {
    // `key`：原平台快照当前属性名，只恢复 FileReader/Image/document，不修改其它全局能力。
    // `value`：快照中当前属性的原值，undefined 表示应删除测试临时属性。
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete global[key];
      else global[key] = value;
    }
  }
);

/**
 * GIF/SVG 原文件必须保留，防止动画/矢量语义丢失或被误标 PNG。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('vector and animated formats retain their original file instead of being mislabeled PNG', async () => {
  // `type`：动画/矢量保留场景当前 MIME，分别为 GIF/SVG，必须原对象返回以保留语义。
  for (const type of ['image/svg+xml', 'image/gif']) {
    // `file`：GIF/SVG 内存夹具，文件名与 MIME 对应；不应被误标 PNG 或丢掉原对象。
    const file = new File(['fixture'], `fixture.${type === 'image/gif' ? 'gif' : 'svg'}`, { type });
    expect(await compressImage({ file, maxWidth: 100, maxHeight: 100, quality: 0.8 })).toBe(file);
  }
});

/**
 * 浏览器把 WebP 编码回退为 PNG 时，输出 MIME、扩展名和字节头应同时一致。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('browser encoding fallback determines both file MIME and extension', async () => {
  // `file`：WebP 夹具，画布替身故意输出 PNG，检查返回 MIME、扩展名和字节头一致。
  const file = new File(['fixture'], 'fixture.webp', { type: 'image/webp' });
  // `result`：实际压缩函数返回的文件，校验浏览器回退为 PNG 后名称和类型同时改变。
  const result = await compressImage({ file, maxWidth: 100, maxHeight: 100, quality: 0.8 });
  expect(result.type).toBe('image/png');
  expect(result.name).toBe('fixture.png');
  expect([...new Uint8Array(await result.arrayBuffer()).slice(0, 4)]).toEqual([137, 80, 78, 71]);
});

/**
 * 画布上下文不可用时明确拒绝，不能让上传前处理永久等待。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('unavailable canvas rejects instead of leaving the upload preparation pending', async () => {
  context = null;
  // `file`：用于无画布场景的非空 PNG，确保拒绝而不是永久 pending。
  const file = new File(['fixture'], 'fixture.png', { type: 'image/png' });
  await expect(compressImage({ file })).rejects.toThrow('画布');
});

/**
 * 同步绘制异常转成可被调用方消费的 Promise 拒绝，避免未捕获事件错误。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('a synchronous browser drawing error becomes a rejected preparation promise', async () => {
  context.drawImage.mockImplementation(
    /**
     * 让同步 drawImage 抛出解码错误，验证真实压缩 Promise 必须拒绝而不能挂起或伪装上传成功。
     * @throws {Error} 固定故障夹具。
     */ () => {
      throw new Error('decode failure');
    }
  );
  // `file`：用于同步绘制抛错场景的 PNG，异常必须转成可被 await 的拒绝。
  const file = new File(['fixture'], 'fixture.png', { type: 'image/png' });
  await expect(compressImage({ file })).rejects.toThrow('decode failure');
});

/**
 * 无效宽高/质量应提前拒绝，并且不得污染同文件的下一次有效压缩。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('invalid compression bounds fail before browser reads and a later valid call can proceed', async () => {
  // `file`：参数越界后重试的 PNG，同一输入用于确认无效参数不会破坏后续有效调用。
  const file = new File(['fixture'], 'fixture.png', { type: 'image/png' });
  // `options`：当前非法边界组合，覆盖零宽、NaN 高度、负质量和无限质量。
  for (const options of [{ maxWidth: 0 }, { maxHeight: NaN }, { quality: -1 }, { quality: Infinity }]) {
    await expect(compressImage({ file, ...options })).rejects.toBeInstanceOf(RangeError);
  }
  await expect(compressImage({ file })).resolves.toHaveProperty('type', 'image/png');
});

/**
 * 编码器返回 null 时沿用原文件，不能上传空结果。
 * @returns {Promise<void>} 等待真实异步分支完成后由 Jest 验证断言；拒绝路径必须按用例显式消费。
 */
test('an empty encoder result preserves the original upload file', async () => {
  global.document.createElement = /**
   * 模拟编码器最终返回 null 的 canvas，验证实际压缩逻辑回退原文件，不发布空 Blob。
   * @returns {Object}
   */ () => ({
    getContext: /**
     * 沿用当前绘制上下文，只替换编码完成结果，避免把画布创建失败混入空 Blob 场景。
     * @returns {Object}
     */ () => context,
    toBlob: (/* `done`：空编码结果的完成回调，传 null 以验证原文件兜底。 */ done) => done(null),
  });
  // `file`：编码器返回 null 的 PNG 夹具，预期沿用原始文件对象而不是空上传结果。
  const file = new File(['fixture'], 'fixture.png', { type: 'image/png' });
  expect(await compressImage({ file })).toBe(file);
});

// ───── 模块结束：src/components/UploadFile/__tests__/compression.test.js ─────
