// Maps the page scroll position to the 3D walk progress.
// Anchors: top of the page -> 0, the scroll position where each stop's scene area is in view -> (i + 1) / (n + 1),
// bottom of the page -> 1. Between anchors the progress is interpolated linearly, so the couple reaches a
// station exactly when its card comes up.
export function scrollToProgress(scrollY: number, stopOffsets: number[], maxScroll: number) {
  const count = stopOffsets.length;
  const anchors = [0, ...stopOffsets, Math.max(maxScroll, stopOffsets[count - 1] ?? 0)];
  const values = [0, ...stopOffsets.map((_, index) => (index + 1) / (count + 1)), 1];
  if (scrollY <= anchors[0]) return 0;
  for (let index = 1; index < anchors.length; index++) {
    if (scrollY <= anchors[index]) {
      const span = anchors[index] - anchors[index - 1];
      const ratio = span > 0 ? (scrollY - anchors[index - 1]) / span : 1;
      return values[index - 1] + ratio * (values[index] - values[index - 1]);
    }
  }
  return 1;
}

// ── Classic scroll container ──
export function containerStopOffsets(container: HTMLElement, sectionIds: string[]) {
  const sections = new Map(Array.from(container.querySelectorAll<HTMLElement>("[id]"), (element) => [element.id, element]));
  return sectionIds.flatMap((id) => {
    const section = sections.get(id);
    if (!section) return [];
    let offset = 0;
    let element: HTMLElement | null = section;
    while (element && element !== container) {
      offset += element.offsetTop;
      element = element.offsetParent as HTMLElement | null;
    }
    return [offset];
  });
}

export function containerProgress(container: HTMLElement, sectionIds: string[], offsets = containerStopOffsets(container, sectionIds)) {
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
  if (!maxScroll) return 0;
  return scrollToProgress(container.scrollTop, offsets, maxScroll);
}
