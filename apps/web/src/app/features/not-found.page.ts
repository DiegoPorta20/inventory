import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../shared/ui/states.components';

@Component({
  selector: 'app-not-found-page',
  imports: [EmptyStateComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-empty-state
      icon="search"
      title="Página no encontrada"
      description="La dirección no existe o fue movida."
    >
      <a routerLink="/dashboard" class="btn btn-primary">Ir al panel</a>
    </ui-empty-state>
  `,
})
export class NotFoundPage {}
