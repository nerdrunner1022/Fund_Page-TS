import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { CAMPAIGN_SLUG } from '../src/campaigns/campaign.seed';
import { Donation } from '../src/donations/entities/donation.entity';
import { createTestApp, seedTestData } from './helpers';

describe('Campaign donation flow (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let pendingId: string;
  let token: string;
  let fetchMock: jest.SpyInstance;

  const campaignPath = `/api/campaigns/${CAMPAIGN_SLUG}`;
  const donationPath = `${campaignPath}/donations`;

  beforeAll(async () => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
        base_code: 'LKR',
        rates: {
          LKR: 1,
          USD: 0.004,
          EUR: 0.002,
          GBP: 0.003,
          AED: 0.011,
          SAR: 0.01,
          QAR: 0.01,
          CAD: 0.005,
          AUD: 0.006,
          INR: 0.35,
          MYR: 0.018,
          SGD: 0.005,
        },
      }),
    } as unknown as Response);
    app = await createTestApp();
    await seedTestData(app);
    http = app.getHttpServer();
  });

  afterAll(async () => {
    fetchMock?.mockRestore();
    await app?.close();
  });

  it('serves the seeded campaign with bilingual content', async () => {
    const response = await request(http).get(campaignPath).expect(200);
    expect(response.body.slug).toBe(CAMPAIGN_SLUG);
    expect(response.body.goalMinor).toBe('4800000000');
    expect(response.body.raisedMinor).toBe('0');
    expect(response.body.perchCount).toBe(40);
    expect(response.body.translations.en.title).toMatch(/buy the land/);
    expect(response.body.translations.en.bankAccountNumber).toBe(
      '066-1-001-0-0036343',
    );
    expect(response.body.translations.en.bankAccountName).toBe(
      'Past Students Association, T Zahira College Trincomalee',
    );
    expect(response.body.translations.en.supportersSecondary).toContain(
      'Jammiyathul Ulama',
    );
    expect(response.body.translations.ta.bankAccountNumber).toBe(
      '066-1-001-0-0036343',
    );
    expect(response.body.translations.ta.bankAccountName).toBe(
      'Past Students Association, T Zahira College Trincomalee',
    );
    expect(response.body.translations.ta.school).toContain('ஸாஹிரா');
  });

  it('returns 404 for an unknown campaign', async () => {
    await request(http).get('/api/campaigns/does-not-exist').expect(404);
    await request(http)
      .post('/api/campaigns/does-not-exist/donations')
      .send({ amount: '1000' })
      .expect(404);
  });

  it('rejects malformed and unknown donation fields', async () => {
    await request(http).post(donationPath).send({ amount: '0' }).expect(400);
    await request(http)
      .post(donationPath)
      .send({ amount: '1000', role: 'admin' })
      .expect(400);
    await request(http)
      .post(donationPath)
      .send({ amount: '10000000.01' })
      .expect(400);
    await request(http)
      .post(donationPath)
      .send({ amount: '10', currency: 'JPY' })
      .expect(400);
  });

  it('quotes live conversions only for allowed currencies', async () => {
    const currencies = await request(http).get('/api/fx/currencies').expect(200);
    expect(currencies.body.currencies).toContain('USD');
    expect(currencies.body.currencies).not.toContain('JPY');

    const quote = await request(http)
      .get('/api/fx/quote')
      .query({ currency: 'USD', amount: '10' })
      .expect(200);
    expect(quote.body).toEqual({
      currency: 'USD',
      sourceAmountMinor: '1000',
      amountMinor: '250000',
      rate: '0.004',
    });

    await request(http)
      .get('/api/fx/quote')
      .query({ currency: 'JPY', amount: '10' })
      .expect(400);
  });

  it('records a pending declaration without changing the total', async () => {
    const response = await request(http)
      .post(donationPath)
      .send({ amount: '5000', donorName: 'Test Donor', message: 'Blessings' })
      .expect(201);

    expect(response.body.status).toBe('pending');
    expect(response.body.amountMinor).toBe('500000');
    expect(response.body.referenceCode).toMatch(/^ZCLF-[A-Z2-9]{5}$/);
    pendingId = response.body.id;

    const campaign = await request(http).get(campaignPath).expect(200);
    expect(campaign.body.raisedMinor).toBe('0');

    const totals = await request(http).get(`${donationPath}/totals`).expect(200);
    expect(totals.body).toEqual({ raised: '0', donors: 0 });
    expect(totals.headers['cache-control']).toContain('max-age=30');
  });

  it('converts a foreign declaration to LKR before saving it', async () => {
    const response = await request(http)
      .post(donationPath)
      .send({ amount: '10', currency: 'USD', donorName: 'Foreign Donor' })
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'pending',
      currency: 'USD',
      sourceAmountMinor: '1000',
      amountMinor: '250000',
      fxRate: '0.004',
    });

    const totals = await request(http).get(`${donationPath}/totals`).expect(200);
    expect(totals.body).toEqual({ raised: '0', donors: 0 });
  });

  it('requires a bearer token for admin confirmation', async () => {
    await request(http)
      .post(`/api/admin/donations/${pendingId}/confirm`)
      .expect(401);
  });

  it('rejects invalid admin credentials', async () => {
    await request(http)
      .post('/api/admin/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: 'wrong-password-123' })
      .expect(401);
  });

  it('confirms a donation exactly once and updates the total', async () => {
    const login = await request(http)
      .post('/api/admin/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(200);
    token = login.body.accessToken;
    expect(token).toEqual(expect.any(String));

    const confirmed = await request(http)
      .post(`/api/admin/donations/${pendingId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(confirmed.body).toMatchObject({
      id: pendingId,
      status: 'confirmed',
      raisedMinor: '500000',
    });

    await request(http)
      .post(`/api/admin/donations/${pendingId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    const campaign = await request(http).get(campaignPath).expect(200);
    expect(campaign.body.raisedMinor).toBe('500000');
    expect(campaign.body.percent).toBe(0.01);

    const totals = await request(http).get(`${donationPath}/totals`).expect(200);
    expect(totals.body).toEqual({ raised: '500000', donors: 1 });
  });

  it('exposes only amount and date for confirmed donations publicly', async () => {
    const response = await request(http).get(donationPath).expect(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({ amountMinor: '500000' });
    expect(response.body.items[0]).not.toHaveProperty('donorName');
    expect(response.body.items[0]).not.toHaveProperty('bankRef');
    expect(response.body.items[0]).not.toHaveProperty('slipUrl');
    expect(Object.keys(response.body.items[0]).sort()).toEqual([
      'amountMinor',
      'confirmedAt',
      'id',
    ]);
    expect(response.body.nextCursor).toBeNull();
  });

  it('declines a pending declaration without touching the total', async () => {
    const created = await request(http)
      .post(donationPath)
      .send({ amount: '1000' })
      .expect(201);

    await request(http)
      .post(`/api/admin/donations/${created.body.id}/decline`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(http)
      .post(`/api/admin/donations/${created.body.id}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    const campaign = await request(http).get(campaignPath).expect(200);
    expect(campaign.body.raisedMinor).toBe('500000');
  });

  it('lists pending donations for admins with the campaign scope', async () => {
    const response = await request(http)
      .get(`/api/admin/campaigns/${CAMPAIGN_SLUG}/donations`)
      .query({ status: 'declined' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].status).toBe('declined');
  });

  it('paginates confirmed donations with a stable keyset cursor', async () => {
    const repo = app.get<Repository<Donation>>(getRepositoryToken(Donation));
    const ids: string[] = [];

    for (const [index, amount] of ['2000', '3000'].entries()) {
      const created = await request(http)
        .post(donationPath)
        .send({ amount })
        .expect(201);
      ids.push(created.body.id);
      await request(http)
        .post(`/api/admin/donations/${created.body.id}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      await repo.update(created.body.id, {
        createdAt: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
      });
    }

    const firstPage = await request(http)
      .get(donationPath)
      .query({ limit: 1 })
      .expect(200);
    expect(firstPage.body.items).toHaveLength(1);
    expect(firstPage.body.items[0].id).toBe(ids[0]);
    expect(firstPage.body.nextCursor).toMatch(/\|/);

    const secondPage = await request(http)
      .get(donationPath)
      .query({ limit: 1, after: firstPage.body.nextCursor })
      .expect(200);
    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.items[0].id).toBe(ids[1]);
  });

  it('requires a bearer token to add a bank-transfer donation', async () => {
    await request(http)
      .post(`/api/admin/campaigns/${CAMPAIGN_SLUG}/donations`)
      .send({ amount: '2500', bankRef: 'TXN-2026-001' })
      .expect(401);
  });

  it('adds a verified transfer once and blocks duplicate bank references', async () => {
    const path = `/api/admin/campaigns/${CAMPAIGN_SLUG}/donations`;
    const input = {
      amount: '2500',
      donorName: 'Bank Transfer',
      bankRef: 'TXN-2026-001',
      donatedOn: '2026-02-10',
    };

    const created = await request(http)
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(input)
      .expect(201);
    expect(created.body).toMatchObject({
      status: 'confirmed',
      bankRef: 'TXN-2026-001',
      donatedOn: '2026-02-10',
      amountMinor: '250000',
      verifiedBy: process.env.ADMIN_EMAIL,
    });

    await request(http)
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(input)
      .expect(409);

    const campaign = await request(http).get(campaignPath).expect(200);
    expect(campaign.body.raisedMinor).toBe('1250000');

    const totals = await request(http).get(`${donationPath}/totals`).expect(200);
    expect(totals.body).toEqual({ raised: '1250000', donors: 4 });
  });

  it('requires a bearer token to edit or delete a donation', async () => {
    await request(http)
      .patch(`/api/admin/donations/${pendingId}`)
      .send({ amount: '3000' })
      .expect(401);
    await request(http).delete(`/api/admin/donations/${pendingId}`).expect(401);
  });

  it('edits a donation and adjusts the total only when its counted state changes', async () => {
    const path = `/api/admin/campaigns/${CAMPAIGN_SLUG}/donations`;
    const created = await request(http)
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '1000', bankRef: 'TXN-UPDATE-001' })
      .expect(201);

    await request(http)
      .get(`${donationPath}/totals`)
      .expect(200)
      .expect(({ body }) => expect(body).toEqual({ raised: '1350000', donors: 5 }));

    const edited = await request(http)
      .patch(`/api/admin/donations/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: '2500',
        donorName: null,
        status: 'declined',
        donatedOn: '2026-03-01',
      })
      .expect(200);
    expect(edited.body).toMatchObject({
      amountMinor: '250000',
      donorName: null,
      status: 'declined',
      donatedOn: '2026-03-01',
      confirmedAt: null,
      verifiedBy: process.env.ADMIN_EMAIL,
    });

    await request(http)
      .get(`${donationPath}/totals`)
      .expect(200)
      .expect(({ body }) => expect(body).toEqual({ raised: '1250000', donors: 4 }));

    // Reinstating it as verified counts the new amount, not the original one.
    const reinstated = await request(http)
      .patch(`/api/admin/donations/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '3000', status: 'confirmed' })
      .expect(200);
    expect(reinstated.body.status).toBe('confirmed');
    expect(reinstated.body.confirmedAt).toEqual(expect.any(String));

    await request(http)
      .get(`${donationPath}/totals`)
      .expect(200)
      .expect(({ body }) => expect(body).toEqual({ raised: '1550000', donors: 5 }));

    const campaign = await request(http).get(campaignPath).expect(200);
    expect(campaign.body.raisedMinor).toBe('1550000');
  });

  it('validates edits and keeps bank references unique', async () => {
    const path = `/api/admin/campaigns/${CAMPAIGN_SLUG}/donations`;
    const other = await request(http)
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '500', bankRef: 'TXN-UPDATE-002' })
      .expect(201);

    const list = await request(http)
      .get(`/api/admin/campaigns/${CAMPAIGN_SLUG}/donations`)
      .query({ status: 'confirmed' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const edited = list.body.items.find(
      (item: { bankRef: string | null }) => item.bankRef === 'TXN-UPDATE-001',
    );

    await request(http)
      .patch(`/api/admin/donations/${edited.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bankRef: other.body.bankRef })
      .expect(409);

    await request(http)
      .patch(`/api/admin/donations/${edited.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
    await request(http)
      .patch(`/api/admin/donations/${edited.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '0' })
      .expect(400);
    await request(http)
      .patch(`/api/admin/donations/${edited.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' })
      .expect(400);
    await request(http)
      .patch(`/api/admin/donations/${edited.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'x'.repeat(501) })
      .expect(400);

    const totals = await request(http).get(`${donationPath}/totals`).expect(200);
    expect(totals.body).toEqual({ raised: '1600000', donors: 6 });
  });

  it('deletes donations and reverses confirmed contributions', async () => {
    const list = await request(http)
      .get(`/api/admin/campaigns/${CAMPAIGN_SLUG}/donations`)
      .query({ status: 'confirmed' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const toDelete = list.body.items.find(
      (item: { bankRef: string | null }) => item.bankRef === 'TXN-UPDATE-001',
    );
    const pending = list.body.items.find(
      (item: { bankRef: string | null }) => item.bankRef === 'TXN-UPDATE-002',
    );

    // Declined/pending rows can be deleted without changing the total.
    await request(http)
      .patch(`/api/admin/donations/${pending.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'pending' })
      .expect(200);
    await request(http)
      .delete(`/api/admin/donations/${pending.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(http)
      .delete(`/api/admin/donations/${pending.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    await request(http)
      .delete(`/api/admin/donations/${toDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const totals = await request(http).get(`${donationPath}/totals`).expect(200);
    expect(totals.body).toEqual({ raised: '1250000', donors: 4 });

    // The public confirmed list no longer contains the deleted row.
    const confirmed = await request(http).get(donationPath).expect(200);
    expect(confirmed.body.items.map((item: { id: string }) => item.id)).not.toContain(
      toDelete.id,
    );
  });

  it('adds and edits foreign-currency transfers with live conversion', async () => {
    const path = `/api/admin/campaigns/${CAMPAIGN_SLUG}/donations`;
    const created = await request(http)
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: '20',
        currency: 'USD',
        donorName: 'FX Donor',
        bankRef: 'TXN-FX-001',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      status: 'confirmed',
      currency: 'USD',
      sourceAmountMinor: '2000',
      amountMinor: '500000',
      fxRate: '0.004',
    });
    await request(http)
      .get(`${donationPath}/totals`)
      .expect(200)
      .expect(({ body }) => expect(body).toEqual({ raised: '1750000', donors: 5 }));

    const edited = await request(http)
      .patch(`/api/admin/donations/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '30', currency: 'GBP' })
      .expect(200);
    expect(edited.body).toMatchObject({
      currency: 'GBP',
      sourceAmountMinor: '3000',
      amountMinor: '1000000',
      fxRate: '0.003',
    });

    await request(http)
      .get(`${donationPath}/totals`)
      .expect(200)
      .expect(({ body }) => expect(body).toEqual({ raised: '2250000', donors: 5 }));
  });
});
