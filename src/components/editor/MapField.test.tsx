import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Editor from '../../pages/Editor';
import { wedding } from '../../test/plan-fixtures';
import { parseMapInput } from '../../lib/mapInput';

afterEach(() => vi.unstubAllGlobals());
const embed = '<iframe src="https://www.google.com/maps/embed?pb=test&amp;language=vi" width="600" height="450" style="border:0" allowfullscreen="" loading="lazy"></iframe>';
const mapUrl = 'https://www.google.com/maps/embed?pb=test&language=vi';
it('extracts only the Google Maps src and rejects unsafe or malformed inputs', () => {
  expect(parseMapInput(embed)).toEqual({ ok: true, url: mapUrl });
  expect(parseMapInput('https://maps.app.goo.gl/example')).toEqual({ ok: true, url: 'https://maps.app.goo.gl/example' });
  expect(parseMapInput('')).toEqual({ ok: true, url: '' });
  for (const value of ['javascript:alert(1)', 'http://google.com/maps', '<iframe></iframe>', '<iframe src="https://evil.example/maps"></iframe>', '<iframe src="https://www.google.com.evil.example/maps"></iframe>', embed + '<script>alert(1)</script>', '<iframe srcdoc="<script>alert(1)</script>"></iframe>']) expect(parseMapInput(value).ok).toBe(false);
});

it('keeps map errors at the main information field, prevents invalid preview/save, then previews and saves the extracted URL', async () => {
  const current = { ...wedding, eventDate: null, venue: { ...wedding.venue, mapUrl: '' }, importedTemplate: { templateId: 'tpl-0000000000000001', values: {}, opening: true, motion: true } };
  const previews: Record<string, any>[] = [], saves: Record<string, any>[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = String(input), payload = options?.body ? JSON.parse(options.body as string) : {};
    let body: unknown = [];
    if (url.endsWith('/template-preview')) { previews.push(payload); body = { html: '<p>Valid preview</p>', boundValues: {} }; }
    else if (url.endsWith('/weddings/' + wedding.id)) {
      if (options?.method === 'PUT') saves.push(payload);
      body = { ...current, ...payload };
    }
    else if (url.includes('slug-available')) body = { available: true, valid: true };
    return new Response(JSON.stringify(body), { status: 200 });
  }));
  render(<MemoryRouter initialEntries={['/thiep-cua-toi/' + wedding.id]}><Routes><Route path="/thiep-cua-toi/:id" element={<Editor />} /></Routes></MemoryRouter>);
  const input = await screen.findByLabelText('Liên kết bản đồ');
  await waitFor(() => expect(previews).toHaveLength(1));
  fireEvent.change(input, { target: { value: 'not a map' } });
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input.closest('.map-field')?.querySelector('[role="alert"]')).toHaveTextContent('https://');
  expect(document.querySelector('.imported-studio [role="alert"]')).toBeNull();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)); });
  expect(previews).toHaveLength(1);
  fireEvent.click(document.querySelector('.editor-top-save')!);
  expect(saves).toHaveLength(0);
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: embed } });
  expect(input).toHaveValue(mapUrl);
  expect(input).toHaveAttribute('aria-invalid', 'false');
  expect(input.closest('.map-field')?.querySelector('[role="alert"]')).toBeNull();
  await waitFor(() => expect(previews.at(-1)?.content.venue.mapUrl).toBe(mapUrl));
  fireEvent.click(document.querySelector('.editor-top-save')!);
  await waitFor(() => expect(saves).toHaveLength(1));
  expect(saves[0].venue.mapUrl).toBe(mapUrl);
  expect(JSON.stringify(saves)).not.toContain('<iframe');
});
