import type { CharacterState } from "./characters";

export type ClipName = "idle" | "walk" | "wave" | "point" | "hug" | "hold";
const priority: Exclude<ClipName, "idle">[] = ["walk", "hold", "hug", "point", "wave"];

// Highest weight wins; the declared priority breaks ties during gesture transitions.
export function pickClip(state: Partial<CharacterState>): ClipName {
  let clip: ClipName = "idle";
  let weight = 0;
  for (const name of priority) {
    if ((state[name] ?? 0) > weight) {
      clip = name;
      weight = state[name]!;
    }
  }
  return clip;
}

export interface ClipAction {
  timeScale: number;
  reset(): ClipAction;
  play(): ClipAction;
  crossFadeTo(action: ClipAction, duration: number, warp: boolean): ClipAction;
}

export interface ClipMixer<T> {
  clipAction(clip: T): ClipAction;
  update(dt: number): unknown;
}

// Structural mixer interface lets tests verify clip selection and fades without a WebGL context.
export function characterAnimator<T extends { name: string }>(clips: T[], mixer: ClipMixer<T>) {
  const actions = new Map<ClipName, ClipAction>();
  const names: ClipName[] = ["idle", ...priority];
  for (const name of names) {
    const clip = clips.find((candidate) => {
      const label = candidate.name.toLowerCase();
      return label.includes(name) || (name === "wave" && label.includes("waving"));
    });
    if (clip) actions.set(name, mixer.clipAction(clip));
  }
  const idle = actions.get("idle") ?? (clips[0] ? mixer.clipAction(clips[0]) : undefined);
  let current: ClipAction | undefined;
  return (state: CharacterState, dt: number) => {
    const selected = pickClip(state);
    const next = actions.get(selected) ?? idle;
    if (next && next !== current) {
      next.reset().play();
      current?.crossFadeTo(next, 0.25, false);
      current = next;
    }
    const walk = actions.get("walk");
    if (walk) walk.timeScale = Math.max(0, Math.min(1, state.walk));
    mixer.update(dt);
  };
}
