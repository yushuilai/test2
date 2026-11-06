import '@testing-library/jest-dom/vitest';

// jsdom 未实现 matchMedia，提供最小桩
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom 未实现 ResizeObserver，提供最小桩
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis !== 'undefined' && !(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;
}

// jsdom 未实现 canvas 2D/WebGL 上下文，静默返回 null，避免 stderr 噪声
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
