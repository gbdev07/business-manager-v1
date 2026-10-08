import { Module } from '@nestjs/common';
import { BarbershopModule } from '@modules/barbershop/barbershop.module';

/**
 * Segment-specific verticals. Each module depends on the core, never the other way around.
 * Add new segments (salon, retail, ...) here.
 */
@Module({
  imports: [BarbershopModule],
})
export class BusinessModulesModule {}
