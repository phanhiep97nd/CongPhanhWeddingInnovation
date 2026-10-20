import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest globals are off, so Testing Library cannot register its automatic cleanup.
afterEach(() => cleanup());
import type { ReactNode, Ref } from 'react';
import { vi } from 'vitest';
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});
vi.mock('motion/react', async () => {
  const { createElement, forwardRef } = await import('react');
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => false,
    useScroll: () => ({ scrollYProgress: actual.motionValue(0) }),
    useTransform: () => actual.motionValue(1),
    motion: new Proxy({}, {
      get: (_target, tag: string) => forwardRef((props: Record<string, unknown>, ref: Ref<HTMLElement>) => {
        const { initial, animate, exit, whileInView, whileHover, whileTap, viewport, transition, variants, layout, ...domProps } = props;
        void initial; void animate; void exit; void whileInView; void whileHover; void whileTap; void viewport; void transition; void variants; void layout;
        return createElement(tag, { ...domProps, ref });
      }),
    }),
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
  };
});

class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null; readonly rootMargin = '0px'; readonly thresholds = [0];
  constructor(private callback: IntersectionObserverCallback) {
  }
  observe(target: Element) {
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this);
  }
  unobserve() {
  } disconnect() {
  } takeRecords() {
    return [];
  }
}
Object.defineProperty(globalThis, 'IntersectionObserver', { writable: true, value: TestIntersectionObserver });
Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: () => Promise.resolve() });
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true, value: () => {
  }
});
