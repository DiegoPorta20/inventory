import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
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
      { label: 'Centros de costo', path: '/cost-centers', icon: 'tag' },
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
  {
    title: 'Administración',
    items: [
      { label: 'Usuarios', path: '/users', icon: 'users' },
      { label: 'Configuración', path: '/settings', icon: 'wrench' },
    ],
  },
];

/** How far (as a fraction of the distance to the pointer) a magnetic button follows the cursor. */
const MAGNET_X = 0.22;
const MAGNET_Y = 0.28;

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2"
    >
      Saltar al contenido
    </a>

    @if (menuOpen()) {
      <div
        class="fixed inset-0 z-30 bg-brand-950/40 backdrop-blur-[3px] lg:hidden"
        (click)="menuOpen.set(false)"
        aria-hidden="true"
      ></div>
    }

    <aside
      class="fixed inset-y-0 left-0 z-40 w-[17rem] p-3.5 transition-transform duration-500 ease-(--ease-soft) lg:translate-x-0"
      [class]="menuOpen() ? 'translate-x-0' : '-translate-x-full'"
      aria-label="Navegación principal"
    >
      <div class="side-panel">
        <div class="flex items-center gap-3 px-1 pb-4">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-brand-100 text-brand-900"
          >
            <ui-icon name="box" [size]="5" />
          </span>
          <div class="min-w-0 leading-tight">
            <p class="text-[19px] font-bold tracking-tight">Inventario</p>
            <p class="truncate text-xs" style="color: var(--side-dim)">Almacén WY Miner</p>
          </div>
        </div>

        <nav class="-mx-1 flex-1 overflow-y-auto px-1 [scrollbar-width:none]" #navEl>
          <div class="nav-track">
            <span class="nav-pill" aria-hidden="true" #pill></span>
            @for (group of nav; track group.title) {
              <p class="nav-group">{{ group.title }}</p>
              @for (item of group.items; track item.path) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="is-on"
                  class="nav-item"
                  (click)="menuOpen.set(false)"
                >
                  <ui-icon [name]="item.icon" [size]="5" />
                  {{ item.label }}
                </a>
              }
            }
          </div>
        </nav>
      </div>
    </aside>

    <div class="lg:pl-[17rem]">
      <header
        class="sticky top-0 z-20 flex items-center gap-3 px-(--gutter) py-4 backdrop-blur-md"
        style="background: color-mix(in srgb, var(--page) 88%, transparent)"
      >
        <button
          type="button"
          class="btn btn-secondary btn-icon rounded-full lg:hidden"
          aria-label="Abrir menú"
          (click)="menuOpen.set(true)"
        >
          <ui-icon name="menu" [size]="5" />
        </button>

        <form class="relative max-w-md flex-1" role="search" (submit)="search($event)">
          <span
            class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400"
          >
            <ui-icon name="search" [size]="4" />
          </span>
          <input
            #searchBox
            class="input input-pill h-11 bg-white pl-10 shadow-sm"
            type="search"
            placeholder="Buscar producto por código o descripción  ( / )"
            aria-label="Buscar producto"
            name="q"
          />
        </form>

        <div class="relative ml-auto">
          <button
            type="button"
            class="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition-colors duration-300 hover:bg-white"
            aria-haspopup="menu"
            [attr.aria-expanded]="userMenuOpen()"
            (click)="userMenuOpen.set(!userMenuOpen())"
          >
            <span
              class="flex size-11 items-center justify-center rounded-full border-2 border-white bg-brand-100 text-sm font-bold text-brand-700 shadow-sm"
            >
              {{ initials() }}
            </span>
            <span class="hidden text-left leading-tight sm:block">
              <span class="block text-[13.5px] font-semibold text-slate-900">{{
                auth.user()?.name
              }}</span>
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
              class="pop-in absolute right-0 z-40 mt-2 w-60 rounded-2xl border bg-white p-1.5 shadow-xl"
              style="border-color: var(--line); transform-origin: top right"
            >
              <div class="mb-1 px-3 py-2" style="border-bottom: 1px solid var(--line)">
                <p class="truncate text-[13.5px] font-semibold text-slate-900">
                  {{ auth.user()?.name }}
                </p>
                <p class="truncate text-xs text-slate-500">{{ auth.user()?.email }}</p>
              </div>
              <a
                role="menuitem"
                routerLink="/account"
                class="menu-item"
                (click)="userMenuOpen.set(false)"
              >
                <ui-icon name="lock" [size]="4" /> Cambiar contraseña
              </a>
              <button type="button" role="menuitem" class="menu-item w-full" (click)="logout()">
                <ui-icon name="logout" [size]="4" /> Cerrar sesión
              </button>
            </div>
          }
        </div>
      </header>

      <main id="main" class="mx-auto w-full max-w-[1600px] px-(--gutter) pt-2 pb-8" tabindex="-1">
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
  private readonly navRef = viewChild<ElementRef<HTMLElement>>('navEl');
  private readonly pillRef = viewChild<ElementRef<HTMLElement>>('pill');

  protected readonly nav = NAV;
  protected readonly menuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  private magnet: HTMLElement | null = null;
  private pillPlaced = false;
  private readonly canHover = matchMedia('(hover: hover) and (pointer: fine)');
  private readonly reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  constructor() {
    afterNextRender(() => {
      this.movePill(false);
      // Web fonts change line heights, so re-measure once they are ready.
      void document.fonts?.ready.then(() => this.movePill(false));
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      // routerLinkActive updates its class in a microtask; measure on the next frame.
      .subscribe(() => requestAnimationFrame(() => this.movePill(true)));
  }

  /** Slides the highlight behind the active item; the first placement is instant. */
  private movePill(animate: boolean): void {
    const pill = this.pillRef()?.nativeElement;
    const track = this.navRef()?.nativeElement.querySelector<HTMLElement>('.nav-track');
    const active = track?.querySelector<HTMLElement>('.nav-item.is-on');
    if (!pill) return;
    if (!track || !active) {
      pill.style.opacity = '0';
      return;
    }
    const instant = !animate || !this.pillPlaced || this.reduceMotion.matches;
    if (instant) pill.style.transition = 'none';
    pill.style.opacity = '1';
    pill.style.height = `${active.offsetHeight}px`;
    pill.style.transform = `translateY(${active.offsetTop}px)`;
    if (instant) {
      void pill.offsetHeight; // commit the instant placement before transitions come back
      pill.style.transition = '';
    }
    this.pillPlaced = true;
  }

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

  @HostListener('window:resize')
  protected onResize(): void {
    this.movePill(false);
  }

  /** Primary actions marked `.magnetic` drift slightly toward the cursor. */
  @HostListener('document:pointermove', ['$event'])
  protected onPointerMove(event: PointerEvent): void {
    if (!this.canHover.matches || this.reduceMotion.matches) return;
    const target = event.target instanceof Element ? event.target : null;
    const next = target?.closest<HTMLElement>('.magnetic') ?? null;

    if (this.magnet && this.magnet !== next) {
      this.magnet.style.translate = '';
      this.magnet = null;
    }
    if (!next) return;

    const box = next.getBoundingClientRect();
    const x = (event.clientX - box.left - box.width / 2) * MAGNET_X;
    const y = (event.clientY - box.top - box.height / 2) * MAGNET_Y;
    next.style.translate = `${x}px ${y}px`;
    this.magnet = next;
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
