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

  it('computes the breakdown with the default settings', () => {
    const breakdown = service.breakdown(100);
    expect(breakdown.priceUsd).toBe(100);
    expect(breakdown.igvUsd).toBe(18);
    expect(breakdown.priceWithIgvUsd).toBe(118);
    expect(breakdown.priceWithIgvPen).toBe(424.8);
  });

  it('round-trips a sol price with IGV back to the stored USD price', () => {
    const penWithIgv = service.breakdown(100).priceWithIgvPen;
    expect(service.usdFromPen(penWithIgv)).toBe(100);
  });
});
