import hosts from '../../api/data/google-map-hosts.json';
export const googleMapHosts = new Set(hosts);
export type MapVenue = { mapUrl: string; name: string; address: string };

// Embed URLs are iframe sources, never navigation destinations. The opaque `pb`
// payload is kept intact; do not guess its undocumented internal representation.
export function venueMap(venue: MapVenue): { embedUrl: string; openUrl: string } {
  const empty = { embedUrl: '', openUrl: '' };
  let url: URL;
  try { url = new URL(venue.mapUrl); } catch { return empty; }
  if (url.protocol !== 'https:' || url.username || url.password) return empty;
  const embedded = googleMapHosts.has(url.hostname) && /^\/maps(?:\/|$)/.test(url.pathname) && (url.pathname === '/maps/embed' || url.pathname.startsWith('/maps/embed/') || url.searchParams.get('output') === 'embed');
  if (!embedded) return { embedUrl: '', openUrl: url.href };
  const query = url.searchParams.get('q') || url.searchParams.get('query');
  const destination = url.searchParams.get('destination');
  const center = url.searchParams.get('center');
  let open: URL | undefined;
  if (destination) {
    open = new URL('https://www.google.com/maps/dir/');
    open.searchParams.set('api', '1'); open.searchParams.set('destination', destination);
    const origin = url.searchParams.get('origin'); if (origin) open.searchParams.set('origin', origin);
  } else if (query || venue.address.trim() || venue.name.trim()) {
    open = new URL('https://www.google.com/maps/search/');
    open.searchParams.set('api', '1');
    const search = query || [venue.name.trim(), venue.address.trim()].filter(Boolean).join(', ');
    open.searchParams.set('query', search.startsWith('place_id:') ? venue.name.trim() || 'Địa điểm' : search);
    if (search.startsWith('place_id:')) open.searchParams.set('query_place_id', search.slice(9));
  } else if (center) {
    open = new URL('https://www.google.com/maps/@');
    open.searchParams.set('api', '1'); open.searchParams.set('map_action', 'map'); open.searchParams.set('center', center);
  }
  return { embedUrl: url.href, openUrl: open?.href || '' };
}
