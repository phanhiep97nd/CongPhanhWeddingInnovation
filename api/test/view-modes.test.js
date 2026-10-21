import { describe, it, expect } from 'vitest';
import { useDatabase, app, request, register, createWedding, authorized, Wedding } from './helpers/db';

useDatabase();

async function premiumWedding() {
  const account = await register();
  const wedding = (await createWedding(account.token)).body;
  await Wedding.updateOne({ _id: wedding.id }, { $set: { plan: 'premium' } });
  return { account, wedding, owner: `/weddings/${wedding.id}`, publicPath: `/public/weddings/${wedding.slug}` };
}

describe('Hỷ 3D template and viewing modes', () => {
  it('saves the hy3d template for a premium wedding', async () => {
    // Regression: the Mongoose enum used to omit hy3d, so saving failed although the validator accepted it.
    const { account, owner } = await premiumWedding();
    const result = await request(app).put(owner).set(authorized(account.token)).send({ template: 'hy3d' });
    expect(result.status).toBe(200);
    expect(result.body.template).toBe('hy3d');
    expect((await Wedding.findById(result.body.id)).template).toBe('hy3d');
  });

  it('enables all three viewing modes by default and exposes them publicly', async () => {
    const { wedding, publicPath } = await premiumWedding();
    expect(wedding.viewModes).toEqual(['3d', 'mixed', 'normal']);
    const result = await request(app).get(publicPath);
    expect(result.body.viewModes).toEqual(['3d', 'mixed', 'normal']);
  });

  it('stores a subset in a stable order without duplicates', async () => {
    const { account, owner } = await premiumWedding();
    const result = await request(app).put(owner).set(authorized(account.token)).send({ viewModes: ['normal', 'mixed', 'normal'] });
    expect(result.status).toBe(200);
    expect(result.body.viewModes).toEqual(['mixed', 'normal']);
  });

  it('rejects an empty list or unknown modes', async () => {
    const { account, owner } = await premiumWedding();
    expect((await request(app).put(owner).set(authorized(account.token)).send({ viewModes: [] })).status).toBe(400);
    expect((await request(app).put(owner).set(authorized(account.token)).send({ viewModes: ['vr'] })).status).toBe(400);
    expect((await request(app).put(owner).set(authorized(account.token)).send({ viewModes: '3d' })).status).toBe(400);
  });
});
