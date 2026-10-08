import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService);
  const port = config.get<number>('port', 3000);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API running on http://localhost:${port}/${config.get<string>('apiPrefix')}`);
  if (config.get<boolean>('swagger.enabled')) {
    logger.log(
      `Swagger available at http://localhost:${port}/${config.get<string>('swagger.path')}`,
    );
  }
}

void bootstrap();
