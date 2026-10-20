// ResizeObserver is missing on iOS 12 WebViews (old Zalo/Messenger in-app browsers) and in jsdom:
// fall back to window resize events there. Returns a cleanup function.
export function observeResize(element: Element, callback: () => void) {
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => callback());
    observer.observe(element);
    return () => observer.disconnect();
  }
  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
}
