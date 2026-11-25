import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

/**
 * Shared HTTP configuration for the Nest application. Vercel's NestJS builder
 * calls the same bootstrap path as the local server, so this stays in one place.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  // Only trust X-Forwarded-* when the API really runs behind one trusted proxy.
  // On Vercel this should be set to true so rate limiting keys on the visitor
  // instead of the platform's proxy address.
  if (config.get<boolean>('TRUST_PROXY')) {
    const httpAdapter = app.getHttpAdapter().getInstance() as {
      set?: (setting: string, value: unknown) => void;
    };
    httpAdapter.set?.('trust proxy', 1);
  }

  app.use(helmet());
  app.enableCors({
    origin: config
      .getOrThrow<string>('CORS_ORIGINS')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: false,
  });
  app.setGlobalPrefix('api');
}
