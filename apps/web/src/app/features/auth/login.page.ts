import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BrandingService } from '../../core/config/branding.service';
import { ClientConfigService } from '../../core/config/client-config.service';
import { errorMessage } from '../../core/http/api-utils';
import { IconComponent } from '../../shared/ui/icon.component';

type CompanyState = 'asking' | 'loading' | 'ready' | 'missing';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-screen gap-3.5 lg:grid-cols-2 lg:p-3.5">
      <section
        class="relative hidden flex-col justify-between overflow-hidden rounded-[26px] bg-brand-900 p-10 text-white shadow-lg lg:flex"
      >
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[13px] bg-brand-100 text-brand-900"
          >
            @if (logo(); as logo) {
              <img [src]="logo" alt="" class="size-full object-contain" />
            } @else {
              <ui-icon name="box" [size]="6" />
            }
          </span>
          <span class="text-lg font-semibold">{{ appName() }}</span>
        </div>
        <div class="max-w-md">
          <h2 class="text-3xl leading-tight font-semibold tracking-tight">
            Sabe qué tienes, qué falta y qué pedir.
          </h2>
          <p class="mt-4 text-brand-100">
            Control de repuestos, importaciones, movimientos y reposición en un solo lugar.
          </p>
        </div>
        <p class="text-sm text-brand-200">{{ tagline() }}</p>
        <div
          class="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-brand-700/40"
        ></div>
        <div
          class="pointer-events-none absolute -top-16 right-20 h-48 w-48 rounded-full bg-brand-800/60"
        ></div>
      </section>

      <section class="flex items-center justify-center p-6">
        @switch (state()) {
          @case ('loading') {
            <p class="text-sm text-slate-500" role="status">Cargando…</p>
          }
          @case ('ready') {
            <form class="w-full max-w-sm" [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="mb-8 flex items-center gap-2.5 lg:hidden">
                <span
                  class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-brand-600 text-white"
                >
                  @if (logo(); as logo) {
                    <img [src]="logo" alt="" class="size-full object-contain" />
                  } @else {
                    <ui-icon name="box" [size]="5" />
                  }
                </span>
                <span class="text-lg font-semibold">{{ appName() }}</span>
              </div>

              <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h1>
              <p class="mt-1 text-sm text-slate-500">
                {{ companyName() }}
                <a class="ml-1 text-brand-700 hover:underline" href="/login">Cambiar empresa</a>
              </p>

              @if (error()) {
                <div
                  class="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                  role="alert"
                >
                  <ui-icon name="alert" [size]="4" />
                  <span>{{ error() }}</span>
                </div>
              }

              <div class="mt-6 space-y-4">
                <div>
                  <label class="label" for="email">Correo electrónico</label>
                  <input
                    id="email"
                    class="input"
                    type="email"
                    formControlName="email"
                    autocomplete="username"
                    autofocus
                  />
                  @if (form.controls.email.touched && form.controls.email.invalid) {
                    <p class="field-error">Ingresa un correo válido.</p>
                  }
                </div>
                <div>
                  <label class="label" for="password">Contraseña</label>
                  <input
                    id="password"
                    class="input"
                    type="password"
                    formControlName="password"
                    autocomplete="current-password"
                  />
                  @if (form.controls.password.touched && form.controls.password.invalid) {
                    <p class="field-error">Ingresa tu contraseña.</p>
                  }
                </div>
              </div>

              <button type="submit" class="btn btn-primary mt-6 h-10 w-full" [disabled]="pending()">
                {{ pending() ? 'Ingresando…' : 'Ingresar' }}
              </button>
            </form>
          }
          @default {
            <form
              class="w-full max-w-sm"
              [formGroup]="companyForm"
              (ngSubmit)="goToCompany()"
              novalidate
            >
              <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Tu empresa</h1>
              <p class="mt-1 text-sm text-slate-500">
                @if (state() === 'missing') {
                  No encontramos la empresa «{{ company() }}». Revisa el código e inténtalo de
                  nuevo.
                } @else {
                  Ingresa el código de tu empresa para continuar.
                }
              </p>
              <div class="mt-6">
                <label class="label" for="code">Código de la empresa</label>
                <input
                  id="code"
                  class="input"
                  formControlName="code"
                  autocomplete="organization"
                  autocapitalize="none"
                  autofocus
                />
              </div>
              <button type="submit" class="btn btn-primary mt-6 h-10 w-full">Continuar</button>
            </form>
          }
        }
      </section>
    </div>
  `,
})
export class LoginPage {
  /** The company slug from the address (/:company/login), when there is one. */
  readonly company = input<string>();

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly config = inject(ClientConfigService);
  private readonly branding = inject(BrandingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<CompanyState>('asking');
  protected readonly companyName = signal('');
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly appName = computed(() => this.branding.current()?.appName ?? 'Inventario');
  protected readonly tagline = computed(() => this.branding.current()?.tagline ?? '');
  protected readonly logo = computed(() => this.branding.current()?.logoUrl ?? null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly companyForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{3,60}$/)]],
  });

  constructor() {
    effect(() => {
      const slug = this.company();
      if (!slug) {
        this.state.set('asking');
        return;
      }
      this.state.set('loading');
      void this.config.loadPublicBranding(slug).then((result) => {
        this.companyName.set(result?.name ?? '');
        this.state.set(result ? 'ready' : 'missing');
      });
    });
  }

  protected goToCompany(): void {
    if (this.companyForm.invalid) return;
    const code = this.companyForm.getRawValue().code.trim().toLowerCase();
    void this.router.navigate(['/', code, 'login']);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    const company = this.company();
    if (this.form.invalid || this.pending() || !company) return;

    this.pending.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(company, email, password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/');
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'Correo o contraseña incorrectos.';
      if (error.status === 403) return 'Esta empresa está suspendida. Contacta a tu proveedor.';
      if (error.status === 503)
        return 'No se pudo verificar la empresa. Inténtalo en unos minutos.';
    }
    return errorMessage(error, 'No se pudo iniciar sesión.');
  }
}
