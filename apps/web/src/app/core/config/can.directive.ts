import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { ClientConfigService } from './client-config.service';

/** Renders its element only when the user holds the permission: `<button *appCan="'products.create'">`. */
@Directive({ selector: '[appCan]' })
export class CanDirective {
  readonly appCan = input.required<string | string[]>();
  /** Show the element when the permission is missing instead (e.g. a read-only notice). */
  readonly appCanNot = input(false);

  private readonly config = inject(ClientConfigService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private shown = false;

  constructor() {
    effect(() => {
      const needed = [this.appCan()].flat();
      const allowed = needed.every((code) => this.config.can(code));
      const show = this.appCanNot() ? !allowed : allowed;
      if (show && !this.shown) {
        this.container.createEmbeddedView(this.template);
        this.shown = true;
      } else if (!show && this.shown) {
        this.container.clear();
        this.shown = false;
      }
    });
  }
}

/** Like `appCan`, but passes when at least one of the permissions is held. */
@Directive({ selector: '[appCanAny]' })
export class CanAnyDirective {
  readonly appCanAny = input.required<string[]>();

  private readonly config = inject(ClientConfigService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private shown = false;

  constructor() {
    effect(() => {
      const allowed = this.appCanAny().some((code) => this.config.can(code));
      if (allowed && !this.shown) {
        this.container.createEmbeddedView(this.template);
        this.shown = true;
      } else if (!allowed && this.shown) {
        this.container.clear();
        this.shown = false;
      }
    });
  }
}
