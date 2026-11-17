import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  let service: PricingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PricingService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PricingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('computes the breakdown in soles with the default IGV', () => {
    const breakdown = service.breakdown(100);
    expect(breakdown.pricePen).toBe(100);
    expect(breakdown.igvPen).toBe(18);
    expect(breakdown.priceWithIgvPen).toBe(118);
  });

  it('round-trips a price with IGV back to the stored base price', () => {
    expect(service.priceFromWithIgv(service.breakdown(100).priceWithIgvPen)).toBe(100);
  });
});
