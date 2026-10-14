import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Express } from 'express';

/** Shared by main.ts and the e2e tests so both run the exact same HTTP pipeline. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  // Required behind a reverse proxy so rate limiting sees the client IP, not the proxy's.
  (app.getHttpAdapter().getInstance() as Express).set('trust proxy', config.get('trustProxy'));
  app.setGlobalPrefix(config.get<string>('apiPrefix', 'api/v1'));
  app.enableCors();
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (config.get<boolean>('swagger.enabled')) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Business Platform API')
        .setDescription(
          'Multi-tenant SaaS platform for small and medium businesses. ' +
            'Core endpoints are shared by every segment; business-module endpoints ' +
            '(e.g. /barbershop/*) are only available to tenants of that segment.',
        )
        .setVersion('1.0.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(config.get<string>('swagger.path', 'docs'), app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }
}
