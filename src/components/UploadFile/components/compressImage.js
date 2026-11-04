/**
 * 模块职责：在上传前缩小 JPEG/PNG/WebP 静态位图，输出类型按浏览器实际 Blob MIME 决定。
 * GIF/SVG 原样返回以保留动画/矢量语义；文件读取、绘制和编码失败通过 Promise 拒绝交给上传 owner。
 * 本函数不发请求或发布组件状态，无法强制取消浏览器解码；调用方负责忽略离开后的结果。
 */
// 只为三种可压缩输出格式定义扩展名，必须按 own property 判断，不能让原型键成为合法类型。
const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/**
 * @param {Object} options file 为非空 Blob/File；maxWidth/maxHeight 为正整数像素，默认 1920。
 * quality 为 0..1，默认 0.8；它只影响浏览器支持质量参数的编码器。
 * @returns {Promise<File|Blob>} GIF/SVG 等格式原样返回；编码失败拒绝，空 Blob 回退原文件。
 * 浏览器可能把 WebP 回退为 PNG，此时按 blob.type 更新扩展名；不负责服务端校验或取消请求。
 */
export async function compressImage({
  /* `file`：调用方选中的非空 File/Blob；仅 JPEG/PNG/WebP 重编码，其余 MIME 原样返回。 */ file,
  /* `maxWidth`：输出最大像素宽，默认 1920，必须为正整数；和高度共同确定比例。 */ maxWidth = 1920,
  /* `maxHeight`：输出最大像素高，默认 1920，必须为正整数，不允许把小图放大。 */ maxHeight = 1920,
  /* `quality`：浏览器编码质量 0..1，默认 0.8；PNG 等格式可能忽略此参数。 */ quality = 0.8,
}) {
  if (!(file instanceof Blob) || !file.size) throw new TypeError('请选择非空图片文件');
  if (
    ![maxWidth, maxHeight].every(
      (/* `value`：待验证的最大宽/高值，要求为正整数像素，不依赖字符串自动转换。 */ value) =>
        Number.isInteger(value) && value > 0
    )
  )
    throw new RangeError('图片最大边长必须为正整数');
  if (!Number.isFinite(quality) || quality < 0 || quality > 1) throw new RangeError('图片质量必须在 0 到 1 之间');
  if (!Object.hasOwn(extensions, file.type)) return file;

  return new Promise(
    (
      /* `resolve`：本次 Promise 的成功出口，接受原文件或实际输出 File；finish 负责解绑事件。 */ resolve,
      /* `reject`：本次 Promise 的失败出口，只通知上传 owner，不直接修改组件状态。 */ reject
    ) => {
      // FileReader 与 Image 只属于本次调用；finish 在任何收口路径释放两个对象的回调。
      const reader = new FileReader();
      // `image`：本次调用独有的解码图像；finish 解除 onload/onerror，调用方负责忽略离开后的结果。
      const image = new Image();
      /**
       * 完成当前 Promise 并解除文件/图像事件回调，防止重复事件继续消费已结束结果。
       * @param {Function} callback 本次 Promise 的 resolve 或 reject。
       * @param {*} value 成功文件或公开化错误，不写入任何全局状态。
       * @returns {void}
       */
      const finish = (callback, value) => {
        reader.onload = reader.onerror = reader.onabort = null;
        image.onload = image.onerror = null;
        callback(value);
      };
      image.onload = /**
       * 图片解码完成后校验像素尺寸、限制缩放比例并编码；同步 canvas 异常也通过 finish 拒绝，完成时解绑读取与图像回调。
       * @returns {void}
       */ () => {
        try {
          if (!image.width || !image.height) throw new Error('图片尺寸无效');
          // 比例最大为 1，避免把小图放大；宽高按像素取整且不小于 1。
          // `scale`：原图到目标边长的最小缩放比例，最大 1，确保小图不会被放大。
          const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
          // `canvas`：本次编码的离屏画布；宽高按缩放比例取整且至少 1 像素，不插入页面。
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          // `context`：画布的 2D 绘图上下文；浏览器拒绝创建时通过 Promise 报错而不继续编码。
          const context = canvas.getContext('2d');
          if (!context) throw new Error('浏览器无法创建图片画布');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (/* `blob`：浏览器 toBlob 返回的实际编码数据；null 时回退原文件，MIME 以实际返回值为准。 */ blob) => {
              try {
                if (!blob) return finish(resolve, file);
                if (!Object.hasOwn(extensions, blob.type)) throw new Error('浏览器返回了不支持的图片格式');
                // 浏览器编码回退时必须同时修改 MIME 与扩展名；同格式压缩保留调用方原名。
                // `originalName`：输入 File 的显示名或 image 兜底名；不作为资源路径，也不发送网络请求。
                const originalName = file.name || 'image';
                // `name`：输出文件名；同 MIME 保留原名，浏览器回退格式时同步替换扩展名。
                const name =
                  blob.type === file.type ? originalName : originalName.replace(/\.[^.]+$/, '') + extensions[blob.type];
                finish(resolve, new File([blob], name, { type: blob.type, lastModified: Date.now() }));
              } catch (/* `error`：输出格式或 File 构造失败，解除事件后拒绝，不返回 MIME 与扩展名不一致的文件。 */ error) {
                finish(reject, error);
              }
            },
            file.type,
            quality
          );
        } catch (/* `error`：尺寸检查、画布创建或绘制/编码启动失败，统一走 finish 释放事件引用。 */ error) {
          finish(reject, error);
        }
      };
      image.onerror = /**
       * 图片解码失败时拒绝当前压缩任务并解绑平台回调，不回填空资源或伪装压缩成功。
       * @returns {void}
       */ () => finish(reject, new Error('图片加载失败'));
      reader.onload = (
        /* `event`：本次 FileReader 读取完成事件；其 result 是当前图片 data URL，仅供解码，不持久化。 */ event
      ) => {
        try {
          image.src = event.target.result;
        } catch (/* `error`：读取结果赋给图片时的同步异常，交给调用方决定是否使用原文件。 */ error) {
          finish(reject, error);
        }
      };
      reader.onerror = /**
       * 文件读取失败时经统一 finish 拒绝并清理回调，错误只属于本次文件读取。
       * @returns {void}
       */ () => finish(reject, new Error('文件读取失败'));
      reader.onabort = /**
       * FileReader 被取消时拒绝本次读取并释放引用，不能把取消结果继续送入图片解码。
       * @returns {void}
       */ () => finish(reject, new Error('文件读取已取消'));
      try {
        reader.readAsDataURL(file);
      } catch (/* `error`：FileReader 启动读取失败，立即解绑本次回调并拒绝 Promise。 */ error) {
        finish(reject, error);
      }
    }
  );
}

// ───── 模块结束：src/components/UploadFile/components/compressImage.js ─────
