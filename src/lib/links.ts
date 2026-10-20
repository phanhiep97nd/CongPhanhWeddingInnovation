export function inviteLink(origin: string, slug: string, code?: string) { return `${origin.replace(/\/$/, '')}/w/${encodeURIComponent(slug)}${code ? '/' + encodeURIComponent(code) : ''}`; }
