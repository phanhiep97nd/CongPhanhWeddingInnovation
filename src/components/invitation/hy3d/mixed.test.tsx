import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ClassicInvitation from "../original/InvitationShell";
import MixedMode from "./MixedMode";
import { containerProgress, containerStopOffsets } from "./progress";
import { sceneOptionsFor } from "./scene/sceneData";
import { wedding } from "../../../test/plan-fixtures";
import type { Wedding } from "../../../lib/types";

const canvas = vi.hoisted(() => ({ setProgress: vi.fn(), props: vi.fn() }));

vi.mock("./Hy3dCanvas", async () => {
  const { createElement, forwardRef, useImperativeHandle } = await import("react");
  return {
    default: forwardRef(function Canvas(props, ref) {
      canvas.props(props);
      useImperativeHandle(ref, () => ({ setProgress: canvas.setProgress }), []);
      return createElement("canvas");
    }),
  };
});

const mixedWedding: Wedding = {
  ...wedding,
  coverImage: "/hero.jpg",
  sections: [
    { key: "story", enabled: true },
    { key: "timeline", enabled: true },
    { key: "gallery", enabled: false },
    { key: "rsvp", enabled: true },
    { key: "custom:test", enabled: true },
  ],
  customSections: [{ id: "test", title: "Lời nhắn", body: "Hẹn gặp bạn", image: "" }],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  canvas.setProgress.mockClear();
  canvas.props.mockClear();
});

function metrics(element: HTMLElement, values: Record<string, number | HTMLElement | null>) {
  for (const [key, value] of Object.entries(values)) {
    // writable: scrollTop is reassigned by the tests to simulate scrolling.
    Object.defineProperty(element, key, { configurable: true, writable: true, value });
  }
}

function scrollFixture() {
  const container = document.createElement("div");
  container.innerHTML = '<main><div id="story"></div><div id="custom-test"></div><div id="info"></div></main>';
  metrics(container, { scrollTop: 0, scrollHeight: 4000, clientHeight: 800 });
  const sections = Array.from(container.querySelectorAll<HTMLElement>("[id]"));
  sections.forEach((section, index) => metrics(section, { offsetTop: (index + 1) * 800, offsetParent: container }));
  return container;
}

describe("classic backdrop opt-in", () => {
  it("keeps the regular classic shell and hero photo without new props", () => {
    const { container } = render(<ClassicInvitation wedding={mixedWedding} guest={null} slug="test" />);
    expect(container.querySelector(".scroll-container")).not.toHaveClass("classic-over-3d");
    expect(screen.getByRole("img", { name: "Wedding" })).toBeInTheDocument();
    expect(container.querySelector(".classic-3d-backdrop")).toBeNull();
    expect(container.querySelector("#rsvp")).toBeNull();
  });

  it("renders the backdrop first and exposes and clears the scroll container", () => {
    const onScrollContainer = vi.fn();
    const { container, unmount } = render(
      <ClassicInvitation wedding={mixedWedding} guest={null} slug="test" backdrop={<canvas data-testid="backdrop" />} onScrollContainer={onScrollContainer} />,
    );
    const root = container.querySelector(".scroll-container")!;
    expect(root).toHaveClass("classic-over-3d");
    expect(root.firstElementChild).toHaveClass("classic-3d-backdrop");
    expect(root.firstElementChild).toContainElement(screen.getByTestId("backdrop"));
    expect(onScrollContainer).toHaveBeenCalledWith(root);
    expect(root.querySelector("#rsvp")).toBeInTheDocument();
    expect(root.querySelector("#custom-test")).toBeInTheDocument();
    expect(screen.getByText("Established")).toBeInTheDocument();
    expect(screen.getByLabelText("Các hạng mục thiệp")).toBeInTheDocument();
    unmount();
    expect(onScrollContainer).toHaveBeenLastCalledWith(null);
  });
});

describe("container walk progress", () => {
  const ids = ["story", "custom-test", "info"];

  it("maps each container section offset to its station and interpolates", () => {
    const container = scrollFixture();
    expect(containerProgress(container, ids)).toBe(0);
    for (const [top, expected] of [[800, 0.25], [1200, 0.375], [1600, 0.5], [2400, 0.75], [3200, 1], [3400, 1]]) {
      container.scrollTop = top;
      expect(containerProgress(container, ids)).toBeCloseTo(expected);
    }
  });

  it("includes positioned ancestors when measuring section offsets", () => {
    const container = scrollFixture();
    const main = container.querySelector("main")!;
    metrics(main, { offsetTop: 50, offsetParent: container });
    metrics(container.querySelector<HTMLElement>("#story")!, { offsetParent: main });
    expect(containerStopOffsets(container, ids)).toEqual([850, 1600, 2400]);
  });

  it("handles missing section ids and pages with no stations", () => {
    const container = scrollFixture();
    container.scrollTop = 1600;
    expect(containerStopOffsets(container, ["missing", "custom-test"])).toEqual([1600]);
    expect(containerProgress(container, [])).toBe(0.5);
  });

  it("returns zero for a container that cannot scroll", () => {
    const container = scrollFixture();
    metrics(container, { scrollHeight: 800, clientHeight: 800, scrollTop: 20 });
    expect(containerProgress(container, ids)).toBe(0);
  });
});

describe("mixed scroll wiring", () => {
  it("uses container scroll, coalesces frames, remeasures on resize and cleans up", () => {
    let nextFrame = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => { frames.delete(id); });
    const flush = () => act(() => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(0));
    });
    vi.stubGlobal("ResizeObserver", undefined);
    const { container, unmount } = render(<MixedMode wedding={mixedWedding} guest={null} slug="test" onUnavailable={vi.fn()} />);
    const root = container.querySelector<HTMLElement>(".scroll-container")!;
    metrics(root, { scrollHeight: 4000, clientHeight: 800, scrollTop: 0 });
    ["story", "timeline", "rsvp", "custom-test"].forEach((id, index) => {
      metrics(root.querySelector<HTMLElement>(`#${id}`)!, { offsetTop: (index + 1) * 600, offsetParent: root });
    });
    fireEvent(window, new Event("resize"));
    flush();
    expect(canvas.props).toHaveBeenLastCalledWith(expect.objectContaining({
      options: { background: true },
      data: expect.objectContaining({ stations: ["story", "timeline", "rsvp", "custom:test"] }),
    }));
    canvas.setProgress.mockClear();
    root.scrollTop = 600;
    fireEvent.scroll(window);
    flush();
    expect(canvas.setProgress).not.toHaveBeenCalled();
    fireEvent.scroll(root);
    fireEvent.scroll(root);
    expect(frames.size).toBe(1);
    flush();
    expect(canvas.setProgress).toHaveBeenCalledExactlyOnceWith(0.2);
    metrics(root.querySelector<HTMLElement>("#story")!, { offsetTop: 900 });
    root.scrollTop = 900;
    fireEvent(window, new Event("resize"));
    flush();
    expect(canvas.setProgress).toHaveBeenLastCalledWith(0.2);
    fireEvent.scroll(root);
    expect(frames.size).toBe(1);
    unmount();
    expect(cancelFrame).toHaveBeenCalled();
    expect(frames.size).toBe(0);
    canvas.setProgress.mockClear();
    fireEvent.scroll(root);
    fireEvent(window, new Event("resize"));
    flush();
    expect(canvas.setProgress).not.toHaveBeenCalled();
  });
});

describe("background scene policy", () => {
  it.each([false, true])("disables intro, taps, tilt and portrait shift (lowPower=%s)", (lowPower) => {
    expect(sceneOptionsFor({ background: true, lowPower })).toMatchObject({
      skipIntro: true, taps: false, tilt: false, viewShift: false, fpsCap: 30, pixelRatioCap: 1.25,
    });
  });

  it("enforces the background resolution cap while allowing a lower cap", () => {
    expect(sceneOptionsFor({ background: true, pixelRatioCap: 2 }).pixelRatioCap).toBe(1.25);
    expect(sceneOptionsFor({ background: true, pixelRatioCap: 1 }).pixelRatioCap).toBe(1);
  });

  it("uses brighter exposure and closer fog for the background", () => {
    const normal = sceneOptionsFor();
    const background = sceneOptionsFor({ background: true });
    expect(background.exposure).toBeGreaterThan(normal.exposure);
    expect(background.fogNear).toBeLessThan(normal.fogNear);
    expect(background.fogFar).toBeLessThan(normal.fogFar);
  });

  it("preserves the default scene policy and existing explicit options", () => {
    expect(sceneOptionsFor()).toMatchObject({ skipIntro: false, taps: true, tilt: true, viewShift: true, fpsCap: undefined, pixelRatioCap: 1.75 });
    expect(sceneOptionsFor({ lowPower: true }).pixelRatioCap).toBe(1.25);
    expect(sceneOptionsFor({ skipIntro: true, pixelRatioCap: 1 })).toMatchObject({ skipIntro: true, pixelRatioCap: 1 });
  });
});
