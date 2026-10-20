import '@testing-library/jest-dom/vitest';

class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null; readonly rootMargin = '0px'; readonly thresholds = [0];
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) { this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this); }
  unobserve() {} disconnect() {} takeRecords() { return []; }
}
Object.defineProperty(globalThis, 'IntersectionObserver', { writable: true, value: TestIntersectionObserver });
Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: () => Promise.resolve() });
Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: () => {} });
