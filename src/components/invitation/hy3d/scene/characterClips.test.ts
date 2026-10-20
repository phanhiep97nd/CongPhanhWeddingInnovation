import { describe, expect, it, vi } from "vitest";
import { characterAnimator, pickClip, type ClipAction } from "./characterClips";
import { emptyState } from "./characterRig";

function action(): ClipAction {
  const value: ClipAction = {
    timeScale: 1,
    reset: vi.fn(() => value),
    play: vi.fn(() => value),
    crossFadeTo: vi.fn(() => value),
  };
  return value;
}

describe("character animation clips", () => {
  it("uses idle without gesture weights", () => {
    expect(pickClip({})).toBe("idle");
    expect(pickClip({ walk: 0, wave: 0, hug: -1 })).toBe("idle");
  });

  it("chooses the dominant weight", () => {
    expect(pickClip({ walk: 0.2, hold: 0.8 })).toBe("hold");
    expect(pickClip({ wave: 0.9, point: 0.4 })).toBe("wave");
  });

  it("breaks equal weights in walk, hold, hug, point, wave order", () => {
    const state = { walk: 1, hold: 1, hug: 1, point: 1, wave: 1 };
    expect(pickClip(state)).toBe("walk");
    state.walk = 0;
    expect(pickClip(state)).toBe("hold");
    state.hold = 0;
    expect(pickClip(state)).toBe("hug");
    state.hug = 0;
    expect(pickClip(state)).toBe("point");
    state.point = 0;
    expect(pickClip(state)).toBe("wave");
  });

  it("matches case-insensitive partial names and crossfades once on a state change", () => {
    const clips = ["Armature|IDLE", "mixamo_Walking", "WAVING"].map((name) => ({ name }));
    const actions = clips.map(() => action());
    const mixer = { clipAction: (clip: { name: string }) => actions[clips.indexOf(clip)], update: vi.fn() };
    const update = characterAnimator(clips, mixer);
    const state = emptyState();
    update(state, 0.016);
    state.walk = 0.65;
    update(state, 0.016);
    update(state, 0.016);
    expect(actions[0].crossFadeTo).toHaveBeenCalledWith(actions[1], 0.25, false);
    expect(actions[1].play).toHaveBeenCalledTimes(1);
    expect(actions[1].timeScale).toBe(0.65);
    state.walk = 0;
    state.wave = 1;
    update(state, 0.02);
    expect(actions[1].crossFadeTo).toHaveBeenCalledWith(actions[2], 0.25, false);
    expect(mixer.update).toHaveBeenLastCalledWith(0.02);
  });

  it("falls back to idle when the requested gesture is absent", () => {
    const idle = action();
    const update = characterAnimator([{ name: "Idle" }], { clipAction: () => idle, update: vi.fn() });
    update({ ...emptyState(), hug: 1 }, 0.1);
    expect(idle.play).toHaveBeenCalledOnce();
  });

  it("supports models without animation clips", () => {
    const mixer = { clipAction: vi.fn(), update: vi.fn() };
    expect(() => characterAnimator([], mixer)(emptyState(), 0.1)).not.toThrow();
    expect(mixer.clipAction).not.toHaveBeenCalled();
    expect(mixer.update).toHaveBeenCalledWith(0.1);
  });
});
