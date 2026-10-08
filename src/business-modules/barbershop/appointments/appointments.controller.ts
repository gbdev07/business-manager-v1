import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { BusinessModule, RequirePermissions } from '@common/decorators/auth.decorators';
import { AppointmentsService } from '@modules/barbershop/appointments/appointments.service';
import {
  AppointmentResponseDto,
  CancelAppointmentDto,
  CreateAppointmentDto,
  PaginatedAppointmentsDto,
  QueryAppointmentsDto,
  RescheduleAppointmentDto,
} from '@modules/barbershop/appointments/dto/appointment.dto';
import { BarbershopPermission } from '@modules/barbershop/barbershop.permissions';

@ApiTags('Barbershop · Appointments')
@ApiBearerAuth()
@BusinessModule(BusinessType.BARBERSHOP)
@Controller('barbershop')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('appointments')
  @RequirePermissions(BarbershopPermission.APPOINTMENTS_READ)
  @ApiOkResponse({ type: PaginatedAppointmentsDto })
  list(@Query() query: QueryAppointmentsDto): Promise<PaginatedAppointmentsDto> {
    return this.appointmentsService.list(query);
  }

  @Get('customers/:customerId/appointments')
  @RequirePermissions(BarbershopPermission.APPOINTMENTS_READ)
  @ApiOkResponse({ type: PaginatedAppointmentsDto })
  listForCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: QueryAppointmentsDto,
  ): Promise<PaginatedAppointmentsDto> {
    return this.appointmentsService.listForCustomer(customerId, query);
  }

  @Get('appointments/:id')
  @RequirePermissions(BarbershopPermission.APPOINTMENTS_READ)
  @ApiOkResponse({ type: AppointmentResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<AppointmentResponseDto> {
    return this.appointmentsService.findById(id);
  }

  @Post('appointments')
  @RequirePermissions(BarbershopPermission.APPOINTMENTS_MANAGE)
  @ApiCreatedResponse({ type: AppointmentResponseDto })
  create(@Body() dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    return this.appointmentsService.create(dto);
  }

  @Patch('appointments/:id/reschedule')
  @RequirePermissions(BarbershopPermission.APPOINTMENTS_MANAGE)
  @ApiOkResponse({ type: AppointmentResponseDto })
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.reschedule(id, dto);
  }

  @Patch('appointments/:id/confirm')
  @RequirePermissions(BarbershopPermission.APPOINTMENTS_MANAGE)
  @ApiOkResponse({ type: AppointmentResponseDto })
  confirm(@Param('id', ParseUUIDPipe) id: string): Promise<AppointmentResponseDto> {
    return this.appointmentsService.confirm(id);
  }

  @Patch('appointments/:id/complete')
  @RequirePermissions(BarbershopPermission.APPOINTMENTS_MANAGE)
  @ApiOkResponse({ type: AppointmentResponseDto })
  complete(@Param('id', ParseUUIDPipe) id: string): Promise<AppointmentResponseDto> {
    return this.appointmentsService.complete(id);
  }

  @Patch('appointments/:id/cancel')
  @RequirePermissions(BarbershopPermission.APPOINTMENTS_MANAGE)
  @ApiOkResponse({ type: AppointmentResponseDto })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.cancel(id, dto);
  }

  @Patch('appointments/:id/no-show')
  @RequirePermissions(BarbershopPermission.APPOINTMENTS_MANAGE)
  @ApiOkResponse({ type: AppointmentResponseDto })
  markNoShow(@Param('id', ParseUUIDPipe) id: string): Promise<AppointmentResponseDto> {
    return this.appointmentsService.markNoShow(id);
  }
}
