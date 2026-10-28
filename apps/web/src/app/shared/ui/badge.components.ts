import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { STOCK_STATUS_LABELS, STOCK_STATUS_TONES, type Tone } from '../models/labels';
import type { StockStatus } from '../models/models';
import { IconComponent } from './icon.component';

@Component({
  selector: 'ui-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge-' + tone()"><ng-content /></span>`,
})
export class BadgeComponent {
  readonly tone = input<Tone>('neutral');
}

@Component({
  selector: 'ui-stock-badge',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="'badge-' + tone()">
      <ui-icon [name]="icon()" [size]="3" />
      {{ label() }}
    </span>
  `,
})
export class StockBadgeComponent {
  readonly status = input.required<StockStatus>();

  protected readonly tone = computed(() => STOCK_STATUS_TONES[this.status()]);
  protected readonly label = computed(() => STOCK_STATUS_LABELS[this.status()]);
  protected readonly icon = computed(() => (this.status() === 'OK' ? 'check' : ('alert' as const)));
}
