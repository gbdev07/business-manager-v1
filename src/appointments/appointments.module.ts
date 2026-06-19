import { Module } from '@nestjs/common';
import { AppointmentsScheduleValidator } from '@appointments/appointments-schedule.validator';
import { AppointmentsController } from '@appointments/appointments.controller';
import { AppointmentsService } from '@appointments/appointments.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsScheduleValidator],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
