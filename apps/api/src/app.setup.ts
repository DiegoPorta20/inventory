import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';

export const API_PREFIX = 'api';

export function setupApp(app: NestExpressApplication, env: Env): void {
  app.setGlobalPrefix(API_PREFIX);
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'style-src': ["'self'", "'unsafe-inline'"],
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
  app.enableShutdownHooks();
  serveWebApp(app, env);
}

function serveWebApp(app: NestExpressApplication, env: Env): void {
  const webDist =
    env.WEB_DIST_DIR ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist/browser');
  const indexFile = path.join(webDist, 'index.html');
  if (!existsSync(indexFile)) return;

  app.useStaticAssets(webDist, { index: false, maxAge: '1y', immutable: true });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isPage = request.method === 'GET' && !request.path.startsWith(`/${API_PREFIX}`);
    if (!isPage) return next();
    response.setHeader('Cache-Control', 'no-cache');
    response.sendFile(indexFile);
  });
}
