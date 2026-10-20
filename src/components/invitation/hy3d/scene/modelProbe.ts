// Cheap check for the optional character models, kept apart from glbCharacter.ts so the GLTF loader and the
// Meshopt decoder are only downloaded when the models really exist.
//
// A plain `response.ok` is not enough: the SPA rewrite on Vercel (and Vite's dev fallback) answers unknown paths
// with index.html and status 200, so an HTML content type means "not there".
export function looksLikeModel(response: Response) {
  if (!response.ok) return false;
  const type = (response.headers.get("content-type") || "").toLowerCase();
  return !type.includes("text/html");
}

export async function modelsAvailable(signal?: AbortSignal, probe: typeof fetch = fetch) {
  try {
    const responses = await Promise.all(
      ["bride", "groom"].map((role) => probe(`/models/${role}.glb`, { method: "HEAD", signal })),
    );
    return !signal?.aborted && responses.every(looksLikeModel);
  } catch {
    return false;
  }
}
