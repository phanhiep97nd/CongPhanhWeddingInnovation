import { googleMapHosts } from './venueMap';
type MapInput = { ok: true; url: string } | { ok: false; error: string };
const invalid = (error: string): MapInput => ({ ok: false, error });

// The form accepts pasted embed markup; the saved invitation only contains a URL.
export function parseMapInput(input: string): MapInput {
  let value = input.trim();
  if (!value) return { ok: true, url: '' };
  if (value.length > 10000) return invalid('Nội dung bản đồ quá dài. Hãy dán liên kết hoặc mã nhúng Google Maps.');
  if (value.startsWith('<')) {
    const template = document.createElement('template');
    template.innerHTML = value;
    const nodes = [...template.content.childNodes].filter(node => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim());
    const frame = nodes[0];
    if (nodes.length !== 1 || !(frame instanceof HTMLIFrameElement) || frame.hasAttribute('srcdoc')) return invalid('Hãy dán một mã nhúng iframe của Google Maps có thuộc tính src.');
    value = (frame.getAttribute('src') || '').trim();
    try {
      const url = new URL(value);
      if (!googleMapHosts.has(url.hostname) || !/^\/maps(?:\/|$)/.test(url.pathname)) return invalid('Mã nhúng phải là iframe Google Maps.');
    } catch { return invalid('Mã nhúng Google Maps thiếu liên kết src hợp lệ.'); }
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || /\s/.test(value) || value.length > 2048) throw new Error();
    return { ok: true, url: url.href };
  } catch { return invalid('Dán liên kết bản đồ bắt đầu bằng https:// hoặc mã nhúng iframe Google Maps.'); }
}
