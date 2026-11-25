import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

let appPromise: Promise<NestExpressApplication> | undefined;

async function createServerlessApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  await app.init();
  return app;
}

/**
 * Vercel reuses a warm function instance, so initialise the Nest application
 * once per process and reuse it for later requests.
 */
export function getServerlessApp(): Promise<NestExpressApplication> {
  if (!appPromise) {
    appPromise = createServerlessApp().catch((error: unknown) => {
      appPromise = undefined;
      throw error;
    });
  }
  return appPromise;
}
