import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import type { Branding } from './client-config.models';

const STORAGE_PREFIX = 'inventory.branding.';

/** Paints the company's colors, name and icon onto the page. */
@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly document = inject(DOCUMENT);

  private readonly _current = signal<Branding | null>(null);
  readonly current = this._current.asReadonly();

  apply(branding: Branding): void {
    const root = this.document.documentElement.style;
    for (const [shade, color] of Object.entries(branding.palette.primary)) {
      root.setProperty(`--color-brand-${shade}`, color);
    }
    for (const [shade, color] of Object.entries(branding.palette.accent)) {
      root.setProperty(`--color-accent-${shade}`, color);
    }
    this.document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', branding.palette.primary['600'] ?? branding.primaryColor);

    const icon = branding.faviconUrl ?? branding.logoUrl;
    const link = this.document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon && link) {
      link.href = icon;
      link.type = icon.slice(5, icon.indexOf(';'));
    }
    this._current.set(branding);
  }

  /** Remembers a company's look so the sign-in page paints it instantly next time. */
  remember(slug: string, branding: Branding): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(branding));
    } catch {
      // Storage can be full or disabled; the page just loads the branding from the server.
    }
  }

  restore(slug: string): Branding | null {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + slug);
      return stored ? (JSON.parse(stored) as Branding) : null;
    } catch {
      return null;
    }
  }
}
