import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';
import { AppLogger } from '@common/logger/app.logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(AppLogger);
  logger.setContext('Bootstrap');

  app.useLogger(logger);

  const apiPrefix = configService.getOrThrow<string>('apiPrefix');
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableShutdownHooks();

  const swaggerEnabled = configService.get<boolean>('swagger.enabled') ?? true;
  if (swaggerEnabled) {
    const swaggerPath = configService.get<string>('swagger.path') ?? 'docs';
    const config = new DocumentBuilder()
      .setTitle('Business Manager API')
      .setDescription('SaaS Business Manager Backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log(`Swagger available at /${swaggerPath}`);
  }

  const port = configService.getOrThrow<number>('port');
  await app.listen(port);

  logger.log(`Application running on port ${port}`);
  logger.log(`API prefix: /${apiPrefix}`);
}

void bootstrap();
