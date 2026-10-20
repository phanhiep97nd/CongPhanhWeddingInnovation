import { describe, expect, it, vi } from "vitest";
import { looksLikeModel, modelsAvailable } from "./modelProbe";

const reply = (status: number, type: string) => new Response(null, { status, headers: { "content-type": type } });

describe("optional character models", () => {
  it("treats the SPA's index.html fallback as a missing model", () => {
    expect(looksLikeModel(reply(200, "text/html; charset=utf-8"))).toBe(false);
    expect(looksLikeModel(reply(404, "model/gltf-binary"))).toBe(false);
    expect(looksLikeModel(reply(200, "model/gltf-binary"))).toBe(true);
    expect(looksLikeModel(reply(200, "application/octet-stream"))).toBe(true);
  });

  it("needs both models before loading anything", async () => {
    const probe = vi.fn(async (url: string | URL | Request) => String(url).includes("bride")
      ? reply(200, "model/gltf-binary")
      : reply(200, "text/html")) as unknown as typeof fetch;
    expect(await modelsAvailable(undefined, probe)).toBe(false);
  });

  it("is false when the network fails", async () => {
    const probe = vi.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect(await modelsAvailable(undefined, probe)).toBe(false);
  });
});
