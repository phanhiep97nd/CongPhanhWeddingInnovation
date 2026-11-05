import { describe, it, expect } from 'vitest';
import { useDatabase, app, request, register, createWedding, authorized } from './helpers/db';
useDatabase();
const templateId = 'tpl-07109f7b5da0fc5f';
const content = {
  couple: { groom: 'Hoàng Nam', bride: 'Minh Anh', groomFull: 'Nguyễn Hoàng Nam', brideFull: 'Trần Minh Anh' },
  eventDate: '2028-02-29', eventTime: '17:45', dateText: 'Thứ Ba, ngày 29 tháng 02 năm 2028',
  venue: { name: 'Trung tâm tiệc cưới Hoa Sen', address: '123 Nguyễn Trãi, Hà Nội', mapUrl: 'https://maps.google.com/?q=123+Nguyen+Trai+Ha+Noi' }
};
describe('Our Love Begins information binding', () => {
  it('renders unsaved information in preview without publishing it, then uses saved information publicly', async () => {
    const owner = await register();
    const selected = { templateId, values: { f33: 'Tên mẫu cũ', f101: 'Địa điểm cũ', f45: 'Lời mời riêng' }, opening: false, motion: false };
    const wedding = (await createWedding(owner.token, { importedTemplate: selected, couple: { groom: 'Tên đang lưu', bride: 'Tên đang lưu khác' } })).body;
    const preview = await request(app).post(`/weddings/${wedding.id}/template-preview`).set(authorized(owner.token)).send({ ...selected, content });
    expect(preview.status).toBe(200);
    expect(preview.body.boundValues).toMatchObject({ f33: 'Nguyễn Hoàng Nam  &  Trần Minh Anh', f57: '17:45, Thứ ba', f58: '29.02.2028', f59: '29.02.2028', f60: content.dateText, f101: content.venue.name, f102: content.venue.address });
    expect(preview.body.html).toContain('Nguyễn Hoàng Nam  &amp;  Trần Minh Anh');
    expect(preview.body.html).toContain('Lời mời riêng');
    const before = await request(app).get(`/public/weddings/${wedding.slug}/template-render`);
    expect(before.body.html).toContain('Tên đang lưu');
    expect(before.body.html).not.toContain('Nguyễn Hoàng Nam');
    const saved = await request(app).put(`/weddings/${wedding.id}`).set(authorized(owner.token)).send(content);
    expect(saved.status).toBe(200);
    const after = await request(app).get(`/public/weddings/${wedding.slug}/template-render`);
    for (const value of ['Nguyễn Hoàng Nam  &amp;  Trần Minh Anh', content.venue.name, content.venue.address, '29.02.2028', '17:45, Thứ ba', content.dateText]) expect(after.body.html).toContain(value);
    expect(after.body.html).not.toContain('Tên mẫu cũ');
    expect(after.body.html).not.toContain('Địa điểm cũ');
    expect(after.body.html).not.toContain('(Tức ngày 18 tháng 04 âm lịch)');
  });
  it('validates draft information and honors clearing rather than restoring sample content', async () => {
    const owner = await register();
    const selected = { templateId, values: {}, opening: false, motion: false };
    const wedding = (await createWedding(owner.token, { importedTemplate: selected, ...content })).body;
    const base = `/weddings/${wedding.id}/template-preview`;
    expect((await request(app).post(base).set(authorized(owner.token)).send({ ...selected, content: { venue: { mapUrl: 'javascript:alert(1)' } } })).status).toBe(400);
    const result = await request(app).post(base).set(authorized(owner.token)).send({ ...selected, content: { couple: { groom: '', bride: '', groomFull: '', brideFull: '' }, eventDate: null, eventTime: '', dateText: '', venue: { name: '', address: '', mapUrl: '' } } });
    expect(result.status).toBe(200);
    expect(result.body.boundValues).toMatchObject({ f33: '', f57: '', f58: '', f59: '', f60: '', f101: '', f102: '' });
    expect(result.body.html).not.toContain('23.05.2026');
  });
  it('marks synchronized fields with their editing source while keeping their historical keys', async () => {
    const owner = await register();
    const result = await request(app).get(`/templates/${templateId}/fields`).set(authorized(owner.token));
    expect(result.body.find(field => field.key === 'f33').binding).toEqual({ label: 'Tên cô dâu và chú rể', tab: 'info' });
    expect(result.body.find(field => field.key === 'f45').binding).toBeUndefined();
  });
});
