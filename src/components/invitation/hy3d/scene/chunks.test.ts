import { describe, expect, it } from "vitest";
import { chunkIndex, visibleChunks } from "./chunks";

describe("path chunks", () => {
  it("assigns boundaries and clamps path endpoints", () => {
    expect([0, 0.124, 0.125, 0.999, 1].map((u) => chunkIndex(u, 8))).toEqual([0, 0, 1, 7, 7]);
    expect(chunkIndex(-1, 8)).toBe(0);
    expect(chunkIndex(2, 8)).toBe(7);
  });

  it("handles empty and invalid chunk counts", () => {
    expect(chunkIndex(0.5, 0)).toBe(-1);
    expect(chunkIndex(0.5, 2.5)).toBe(-1);
    expect(visibleChunks(0.5, 0, 1)).toEqual([]);
    expect(chunkIndex(NaN, 8)).toBe(0);
  });

  it("selects chunk centres within a normalized path radius, including the boundary", () => {
    expect(visibleChunks(0.5, 8, 0.1875)).toEqual([2, 3, 4, 5]);
    expect(visibleChunks(0, 8, 0.2)).toEqual([0, 1]);
    expect(visibleChunks(1, 8, 0.2)).toEqual([6, 7]);
  });

  it("clamps the camera and handles an empty radius", () => {
    expect(visibleChunks(-1, 4, 0.125)).toEqual([0]);
    expect(visibleChunks(2, 4, 0.125)).toEqual([3]);
    expect(visibleChunks(0.5, 8, -1)).toEqual([]);
    expect(visibleChunks(0.5, 8, 0)).toEqual([]);
    expect(visibleChunks(0.5, 8, 1)).toHaveLength(8);
  });
});
