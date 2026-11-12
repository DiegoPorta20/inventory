import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { ClientConfigService } from './client-config.service';

/**
 * Route titles are written as "Page · Inventario"; the second part becomes the company's app name.
 * The branding can arrive after the route is activated, so the title follows it.
 */
@Injectable({ providedIn: 'root' })
export class BrandTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly config = inject(ClientConfigService);
  private readonly page = signal<string | undefined>(undefined);

  constructor() {
    super();
    effect(() => {
      const page = this.page();
      const app = this.config.appName();
      this.title.setTitle(page ? `${page} · ${app}` : app);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.page.set(this.buildTitle(snapshot)?.split(' · ')[0]?.trim());
  }
}
