import { afterEach, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import VenueMap from './VenueMap';
import ImportedInvitation from './ImportedInvitation';
import { venueMap } from '../../lib/venueMap';
import { wedding } from '../../test/plan-fixtures';
const venue = { name: 'Nhà hàng', address: 'Hà Nội', mapUrl: 'https://www.google.com/maps/embed/v1/place?key=example&q=Hoan+Kiem+Lake' };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('keeps the embed source in a small iframe and opens the matching place with Maps URLs', () => {
  render(<VenueMap venue={venue} />);
  expect(screen.getByTitle('Bản đồ địa điểm tổ chức')).toHaveAttribute('src', venue.mapUrl);
  expect(screen.getByTitle('Bản đồ địa điểm tổ chức')).toHaveAttribute('height', '240');
  const link = new URL((screen.getByRole('link') as HTMLAnchorElement).href);
  expect(link.pathname).toBe('/maps/search/');
  expect(link.searchParams.get('query')).toBe('Hoan Kiem Lake');
  expect(link.searchParams.has('key')).toBe(false);
});
it('supports directions, place IDs, opaque embed payloads and ordinary shared links without guessing pb', () => {
  const map = (mapUrl: string) => venueMap({ name: '', address: '', mapUrl });
  const directions = new URL(map('https://www.google.com/maps/embed/v1/directions?key=x&origin=A&destination=B').openUrl);
  expect(directions.pathname).toBe('/maps/dir/'); expect(directions.searchParams.get('destination')).toBe('B');
  expect(new URL(map('https://www.google.com/maps/embed/v1/place?key=x&q=place_id:ChIJ123').openUrl).searchParams.get('query_place_id')).toBe('ChIJ123');
  const opaque = 'https://www.google.com/maps/embed?pb=opaque';
  expect(map(opaque)).toEqual({ embedUrl: opaque, openUrl: '' });
  expect(new URL(venueMap({ ...venue, mapUrl: opaque }).openUrl).searchParams.get('query')).toBe('Nhà hàng, Hà Nội');
  expect(map('https://maps.app.goo.gl/example')).toEqual({ embedUrl: '', openUrl: 'https://maps.app.goo.gl/example' });
  expect(map('javascript:alert(1)')).toEqual({ embedUrl: '', openUrl: '' });
  expect(map('https://www.google.com.evil.example/maps/embed').embedUrl).toBe('');
});
it('converts clicks from the imported card instead of opening the Embed API directly', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(String(input).includes('template-render') ? { html: '<p>Card</p>' } : []))));
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  render(<ImportedInvitation wedding={{ ...wedding, venue, hasImportedTemplate: true }} guest={null} slug="map-test" />);
  const frame = await screen.findByTitle(/Thiệp|Minh|Hoa/) as HTMLIFrameElement;
  act(() => window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, data: { type: 'ht:link', url: venue.mapUrl } })));
  expect(open).toHaveBeenCalledWith(venueMap(venue).openUrl, '_blank', 'noopener,noreferrer');
  expect(screen.queryByTitle('Bản đồ địa điểm tổ chức')).toBeNull(); // the library renderer owns the map inside the card
  open.mockClear();
  act(() => window.dispatchEvent(new MessageEvent('message', { source: window, data: { type: 'ht:link', url: venue.mapUrl } })));
  expect(open).not.toHaveBeenCalled();
});
