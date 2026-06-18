import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppLogger } from '@common/logger/app.logger';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';

@Global()
@Module({
  providers: [
    AppLogger,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [AppLogger],
})
export class CommonModule {}
