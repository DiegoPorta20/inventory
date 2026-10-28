import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { loadEnv } from '../src/config/env.js';
import { ensureAdmin, ensureTaxonomy } from '../src/scripts/seed-data.js';
import { DatabaseService } from '../src/shared/infrastructure/database/database.service.js';

describe('Inventory API (e2e)', () => {
  let app: NestExpressApplication;
  let api: ReturnType<typeof request.agent>;
  let productId: number;

  beforeAll(async () => {
    const env = loadEnv();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    setupApp(app, env);
    await app.init();

    const { db } = app.get(DatabaseService);
    await ensureAdmin(db, env);
    await ensureTaxonomy(db);
    api = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/api/products').expect(401);
  });

  it('rejects wrong credentials and accepts valid ones', async () => {
    await api
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'wrong-password' })
      .expect(401);
    const login = await api
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'Passw0rd!test' })
      .expect(200);
    expect(login.body.role).toBe('ADMIN');
    expect(login.body.passwordHash).toBeUndefined();
    await api.get('/api/auth/me').expect(200);
  });

  it('validates input with a stable error shape', async () => {
    const response = await api.post('/api/products').send({ name: '' }).expect(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('creates a product with an internal code and rejects duplicate codes', async () => {
    const created = await api
      .post('/api/products')
      .send({ name: 'Sello de copa', unit: 'PCS', minStock: 10, reorderQuantity: 20, costUsd: 2.5 })
      .expect(201);
    productId = created.body.id;
    expect(created.body.code).toMatch(/^INT-\d{4}$/);
    expect(created.body.isInternalCode).toBe(true);

    await api.post('/api/products').send({ code: ' int-0001 ', name: 'Duplicado' }).expect(409);
  });

  it('keeps stock consistent through movements and refuses overselling', async () => {
    await api
      .post('/api/stock-movements')
      .send({ productId, type: 'IN', reason: 'INITIAL_LOAD', quantity: 12 })
      .expect(201);
    const sale = await api
      .post('/api/stock-movements')
      .send({ productId, type: 'OUT', reason: 'SALE', quantity: 5, counterparty: 'Cliente' })
      .expect(201);
    expect(sale.body.quantity).toBe(-5);
    expect(sale.body.stockAfter).toBe(7);

    const oversell = await api
      .post('/api/stock-movements')
      .send({ productId, type: 'OUT', reason: 'SALE', quantity: 8 })
      .expect(422);
    expect(oversell.body.code).toBe('INSUFFICIENT_STOCK');

    await api
      .post('/api/stock-movements')
      .send({ productId, type: 'IN', reason: 'SALE', quantity: 1 })
      .expect(422);

    const product = await api.get(`/api/products/${productId}`).expect(200);
    expect(product.body.stock).toBe(7);
    expect(product.body.stockStatus).toBe('LOW');
  });

  it('filters products by stock status and suggests a reorder', async () => {
    const low = await api.get('/api/products?stockStatus=LOW').expect(200);
    expect(low.body.items.map((item: { id: number }) => item.id)).toContain(productId);

    const reorder = await api.get('/api/reorder/suggestions').expect(200);
    const suggestion = reorder.body.items.find(
      (item: { product: { id: number } }) => item.product.id === productId,
    );
    expect(suggestion.suggestedQty).toBe(20);
  });

  it('stops suggesting products that are already on order and receives imports into stock', async () => {
    const order = await api
      .post('/api/imports')
      .send({ status: 'ORDERED', items: [{ productId, quantityOrdered: 30, unitCostUsd: 3 }] })
      .expect(201);

    const afterOrder = await api.get('/api/reorder/suggestions').expect(200);
    expect(
      afterOrder.body.items.some(
        (item: { product: { id: number } }) => item.product.id === productId,
      ),
    ).toBe(false);

    const received = await api.post(`/api/imports/${order.body.id}/receive`).send({}).expect(200);
    expect(received.body.status).toBe('RECEIVED');

    const product = await api.get(`/api/products/${productId}`).expect(200);
    expect(product.body.stock).toBe(37);
    expect(product.body.costUsd).toBe(3);

    await api.patch(`/api/imports/${order.body.id}`).send({ notes: 'late' }).expect(422);
    await api.post(`/api/imports/${order.body.id}/receive`).send({}).expect(422);
  });

  it('applies physical count differences as adjustments', async () => {
    const count = await api
      .post('/api/stock-counts')
      .send({ name: 'Conteo de prueba' })
      .expect(201);
    const items = await api.get(`/api/stock-counts/${count.body.id}/items`).expect(200);
    const item = items.body.items.find(
      (candidate: { productId: number }) => candidate.productId === productId,
    );

    await api
      .patch(`/api/stock-counts/${count.body.id}/items/${item.id}`)
      .send({ countedQty: 30 })
      .expect(200);
    const completed = await api.post(`/api/stock-counts/${count.body.id}/complete`).expect(200);
    expect(completed.body.adjustments).toBe(1);

    const product = await api.get(`/api/products/${productId}`).expect(200);
    expect(product.body.stock).toBe(30);

    const movements = await api
      .get(`/api/stock-movements?productId=${productId}&reason=COUNT_ADJUSTMENT`)
      .expect(200);
    expect(movements.body.items[0].quantity).toBe(-7);

    await api.post(`/api/stock-counts/${count.body.id}/complete`).expect(422);
  });

  it('prices products with IGV and exchange rate, and recalculates when settings change', async () => {
    const costCenter = await api
      .post('/api/cost-centers')
      .send({ name: 'Repuesto Jumbo' })
      .expect(201);
    await api
      .patch(`/api/products/${productId}`)
      .send({
        priceUsd: 100,
        costUsd: 60,
        costCenterId: costCenter.body.id,
        specification: 'M12',
        wholesalePriceUsd: 90,
        wholesaleMinQty: 10,
      })
      .expect(200);

    const detail = await api.get(`/api/products/${productId}`).expect(200);
    expect(detail.body.costCenterName).toBe('Repuesto Jumbo');
    expect(detail.body.pricing.retail).toMatchObject({
      priceUsd: 100,
      igvUsd: 18,
      priceWithIgvPen: 424.8,
    });
    expect(detail.body.pricing.wholesale.minQty).toBe(10);
    expect(detail.body.pricing.marginPercent).toBe(40);

    await api.get('/api/settings/pricing').expect(200, { exchangeRate: 3.6, igvRate: 0.18 });
    await api.put('/api/settings/pricing').send({ exchangeRate: 4 }).expect(200);
    const repriced = await api.get(`/api/products/${productId}`).expect(200);
    expect(repriced.body.pricing.retail.priceWithIgvPen).toBe(472);
    await api.put('/api/settings/pricing').send({ exchangeRate: 3.6 }).expect(200);

    const priced = await api
      .get(`/api/products?hasPrice=true&costCenterId=${costCenter.body.id}`)
      .expect(200);
    expect(priced.body.items.map((item: { id: number }) => item.id)).toEqual([productId]);
    await api.put('/api/settings/pricing').send({ exchangeRate: -1 }).expect(400);

    const list = await api.get('/api/products/price-list/export').buffer(true).expect(200);
    expect(list.headers['content-type']).toContain('spreadsheetml');
    await api.delete(`/api/cost-centers/${costCenter.body.id}`).expect(422);
  });

  it('prevents deleting products with history', async () => {
    const response = await api.delete(`/api/products/${productId}`).expect(422);
    expect(response.body.code).toBe('PRODUCT_HAS_HISTORY');
  });

  it('summarises the dashboard and exports spreadsheets', async () => {
    const dashboard = await api.get('/api/dashboard/summary').expect(200);
    expect(dashboard.body.totals.activeProducts).toBeGreaterThanOrEqual(1);

    const file = await api.get('/api/products/export').buffer(true).expect(200);
    expect(file.headers['content-type']).toContain('spreadsheetml');
  });

  it('clears the session on logout', async () => {
    await api.post('/api/auth/logout').expect(204);
    await api.get('/api/auth/me').expect(401);
  });
});
