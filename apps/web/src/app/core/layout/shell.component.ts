import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ROLE_LABELS } from '../../shared/models/labels';
import { IconComponent, type IconName } from '../../shared/ui/icon.component';
import { ToastHostComponent } from '../../shared/ui/toast-host.component';
import { AuthService } from '../auth/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { title: 'Resumen', items: [{ label: 'Panel', path: '/dashboard', icon: 'chart' }] },
  {
    title: 'Inventario',
    items: [
      { label: 'Productos', path: '/products', icon: 'box' },
      { label: 'Categorías', path: '/categories', icon: 'layers' },
      { label: 'Movimientos', path: '/movements', icon: 'swap' },
      { label: 'Conteos físicos', path: '/counts', icon: 'clipboard-check' },
    ],
  },
  {
    title: 'Compras',
    items: [
      { label: 'Reposición', path: '/reorder', icon: 'cart' },
      { label: 'Importaciones', path: '/imports', icon: 'truck' },
      { label: 'Proveedores', path: '/suppliers', icon: 'building' },
      { label: 'Equipos', path: '/equipment', icon: 'wrench' },
    ],
  },
  { title: 'Administración', items: [{ label: 'Usuarios', path: '/users', icon: 'users' }] },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
    >
      Saltar al contenido
    </a>

    @if (menuOpen()) {
      <div
        class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        (click)="menuOpen.set(false)"
        aria-hidden="true"
      ></div>
    }

    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0"
      [class]="menuOpen() ? 'translate-x-0' : '-translate-x-full'"
      aria-label="Navegación principal"
    >
      <div class="flex h-14 items-center gap-2.5 border-b border-slate-100 px-4">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <ui-icon name="box" [size]="5" />
        </span>
        <div class="leading-tight">
          <p class="text-sm font-semibold text-slate-900">Inventario</p>
          <p class="text-xs text-slate-500">Almacén WY Miner</p>
        </div>
      </div>

      <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        @for (group of nav; track group.title) {
          <div>
            <p class="section-title mb-1.5 px-2">{{ group.title }}</p>
            <ul class="space-y-0.5">
              @for (item of group.items; track item.path) {
                <li>
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="bg-brand-50 text-brand-700 font-medium"
                    class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                    (click)="menuOpen.set(false)"
                  >
                    <ui-icon [name]="item.icon" [size]="5" />
                    {{ item.label }}
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </nav>
    </aside>

    <div class="lg:pl-64">
      <header
        class="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur"
      >
        <button
          type="button"
          class="btn btn-ghost btn-icon lg:hidden"
          aria-label="Abrir menú"
          (click)="menuOpen.set(true)"
        >
          <ui-icon name="menu" [size]="5" />
        </button>

        <form class="relative max-w-md flex-1" role="search" (submit)="search($event)">
          <span
            class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
          >
            <ui-icon name="search" [size]="4" />
          </span>
          <input
            #searchBox
            class="input bg-slate-50 pl-9"
            type="search"
            placeholder="Buscar producto por código o descripción  ( / )"
            aria-label="Buscar producto"
            name="q"
          />
        </form>

        <div class="relative ml-auto">
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
            aria-haspopup="menu"
            [attr.aria-expanded]="userMenuOpen()"
            (click)="userMenuOpen.set(!userMenuOpen())"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
            >
              {{ initials() }}
            </span>
            <span class="hidden text-left leading-tight sm:block">
              <span class="block text-sm font-medium text-slate-800">{{ auth.user()?.name }}</span>
              <span class="block text-xs text-slate-500">{{ roleLabel() }}</span>
            </span>
            <ui-icon name="chevron-down" [size]="4" />
          </button>

          @if (userMenuOpen()) {
            <div
              class="fixed inset-0 z-30"
              (click)="userMenuOpen.set(false)"
              aria-hidden="true"
            ></div>
            <div
              role="menu"
              class="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
            >
              <div class="border-b border-slate-100 px-3 py-2">
                <p class="truncate text-sm font-medium text-slate-800">{{ auth.user()?.name }}</p>
                <p class="truncate text-xs text-slate-500">{{ auth.user()?.email }}</p>
              </div>
              <a
                role="menuitem"
                routerLink="/account"
                class="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                (click)="userMenuOpen.set(false)"
              >
                <ui-icon name="lock" [size]="4" /> Cambiar contraseña
              </a>
              <button
                type="button"
                role="menuitem"
                class="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                (click)="logout()"
              >
                <ui-icon name="logout" [size]="4" /> Cerrar sesión
              </button>
            </div>
          }
        </div>
      </header>

      <main id="main" class="mx-auto w-full max-w-7xl p-4 md:p-6" tabindex="-1">
        <router-outlet />
      </main>
    </div>

    <ui-toast-host />
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  protected readonly nav = NAV;
  protected readonly menuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  protected initials(): string {
    const name = this.auth.user()?.name ?? '';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  protected roleLabel(): string {
    return ROLE_LABELS[this.auth.user()?.role ?? ''] ?? '';
  }

  protected search(event: Event): void {
    event.preventDefault();
    const input = this.searchBox()?.nativeElement;
    if (!input) return;
    const term = input.value.trim();
    void this.router.navigate(['/products'], { queryParams: { search: term || null } });
    input.blur();
  }

  protected logout(): void {
    this.userMenuOpen.set(false);
    this.auth.logout().subscribe();
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const typing =
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
    if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.searchBox()?.nativeElement.focus();
    }
    if (event.key === 'Escape') {
      this.menuOpen.set(false);
      this.userMenuOpen.set(false);
    }
  }
}
