import { Module } from '@nestjs/common';
import { BarbersController } from '@barbers/barbers.controller';
import { BarbersService } from '@barbers/barbers.service';

@Module({
  controllers: [BarbersController],
  providers: [BarbersService],
  exports: [BarbersService],
})
export class BarbersModule {}
