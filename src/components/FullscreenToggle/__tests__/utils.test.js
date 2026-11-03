/**
 * @file src/components/FullscreenToggle/__tests__/utils.test.js
 * @description FullscreenToggle 共享 helper 测试，锁定全屏状态判定、事件列表与标准/前缀 API 兼容调用契约。
 */
import {
  FULLSCREEN_CHANGE_EVENTS,
  exitFullscreenFromDocument,
  isFullscreenActive,
  requestFullscreenOnElement,
} from '../utils';
describe('FullscreenToggle utils', () => {
  it('should expose stable fullscreen change events and detect fullscreen state', () => {
    expect(FULLSCREEN_CHANGE_EVENTS).toEqual([
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ]);

    expect(isFullscreenActive({ fullscreenElement: {} })).toBe(true);
    expect(isFullscreenActive({ webkitFullscreenElement: {} })).toBe(true);
    expect(isFullscreenActive({ mozFullScreenElement: {} })).toBe(true);
    expect(isFullscreenActive({ msFullscreenElement: {} })).toBe(true);
    expect(isFullscreenActive({})).toBe(false);
    expect(isFullscreenActive(null)).toBe(false);
  });

  it('should request fullscreen with standard api first and fallback to vendor-prefixed apis', () => {
    const standardElement = { requestFullscreen: jest.fn() };
    const webkitElement = { webkitRequestFullscreen: jest.fn() };
    const mozElement = { mozRequestFullScreen: jest.fn() };
    const msElement = { msRequestFullscreen: jest.fn() };

    expect(requestFullscreenOnElement(standardElement)).toBe(true);
    expect(standardElement.requestFullscreen).toHaveBeenCalledTimes(1);

    expect(requestFullscreenOnElement(webkitElement)).toBe(true);
    expect(webkitElement.webkitRequestFullscreen).toHaveBeenCalledTimes(1);

    expect(requestFullscreenOnElement(mozElement)).toBe(true);
    expect(mozElement.mozRequestFullScreen).toHaveBeenCalledTimes(1);

    expect(requestFullscreenOnElement(msElement)).toBe(true);
    expect(msElement.msRequestFullscreen).toHaveBeenCalledTimes(1);

    expect(requestFullscreenOnElement({})).toBe(false);
    expect(requestFullscreenOnElement(undefined)).toBe(false);
  });

  it('should exit fullscreen with standard api first and fallback to vendor-prefixed apis', () => {
    const standardDocument = { exitFullscreen: jest.fn() };
    const webkitDocument = { webkitExitFullscreen: jest.fn() };
    const mozDocument = { mozCancelFullScreen: jest.fn() };
    const msDocument = { msExitFullscreen: jest.fn() };

    expect(exitFullscreenFromDocument(standardDocument)).toBe(true);
    expect(standardDocument.exitFullscreen).toHaveBeenCalledTimes(1);

    expect(exitFullscreenFromDocument(webkitDocument)).toBe(true);
    expect(webkitDocument.webkitExitFullscreen).toHaveBeenCalledTimes(1);

    expect(exitFullscreenFromDocument(mozDocument)).toBe(true);
    expect(mozDocument.mozCancelFullScreen).toHaveBeenCalledTimes(1);

    expect(exitFullscreenFromDocument(msDocument)).toBe(true);
    expect(msDocument.msExitFullscreen).toHaveBeenCalledTimes(1);

    expect(exitFullscreenFromDocument({})).toBe(false);
    expect(exitFullscreenFromDocument(undefined)).toBe(false);
  });
});
