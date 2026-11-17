import { Controller, Get, Param } from '@nestjs/common';
import { Access } from '../../../shared/domain/access.js';
import { NotFoundError } from '../../../shared/domain/errors.js';
import {
  Authenticated,
  CurrentAccess,
  CurrentUser,
  Public,
} from '../../../shared/presentation/decorators.js';
import type { AuthenticatedUser } from '../../../shared/domain/auth.js';
import { CompanyDirectory } from '../../company-directory/application/ports/company-directory.js';

/** What the web and mobile clients need to adapt themselves to a company and a user. */
@Controller()
export class ClientConfigController {
  constructor(private readonly directory: CompanyDirectory) {}

  @Get('config')
  @Authenticated()
  async config(@CurrentUser() user: AuthenticatedUser, @CurrentAccess() access: Access) {
    const company = await this.directory.findById(user.companyId);
    if (!company) throw new NotFoundError('Company', user.companyId);
    return {
      company: { slug: company.slug, name: company.name },
      branding: company.config.branding,
      role: user.role,
      allowedModules: access.allowedModules(),
      permissions: access.permissions(),
      limits: access.role === 'ADMIN' ? company.config.limits : undefined,
    };
  }

  /** Branding for the sign-in page of /:company, before anyone is signed in. */
  @Get('public/companies/:slug/branding')
  @Public()
  async branding(@Param('slug') slug: string) {
    const company = await this.directory.findBySlug(slug);
    if (!company) throw new NotFoundError('Company', slug);
    return { slug: company.slug, name: company.name, branding: company.config.branding };
  }
}
