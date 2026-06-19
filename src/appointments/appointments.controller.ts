import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { Roles } from '@auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { AppointmentsService } from '@appointments/appointments.service';
import {
  APPOINTMENT_READ_ROLES,
  APPOINTMENT_WRITE_ROLES,
} from '@appointments/constants/appointment.constants';
import {
  CancelAppointmentDto,
  CompleteAppointmentDto,
} from '@appointments/dto/appointment-actions.dto';
import {
  AppointmentResponseDto,
  PaginatedAppointmentsResponseDto,
} from '@appointments/dto/appointment-response.dto';
import { CreateAppointmentDto } from '@appointments/dto/create-appointment.dto';
import { QueryAppointmentsDto } from '@appointments/dto/query-appointments.dto';
import { RescheduleAppointmentDto } from '@appointments/dto/reschedule-appointment.dto';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(...APPOINTMENT_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create appointment',
    description: 'Validates barbershop hours, barber schedule and prevents overlapping slots.',
  })
  @ApiCreatedResponse({ type: AppointmentResponseDto })
  @ApiConflictResponse({ description: 'Barber time slot conflict' })
  @ApiBadRequestResponse({ description: 'Outside business hours or validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.create(dto, currentUser);
  }

  @Get()
  @Roles(...APPOINTMENT_READ_ROLES)
  @ApiOperation({ summary: 'List appointments with filters and pagination' })
  @ApiOkResponse({ type: PaginatedAppointmentsResponseDto })
  findAll(
    @Query() query: QueryAppointmentsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedAppointmentsResponseDto> {
    return this.appointmentsService.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles(...APPOINTMENT_READ_ROLES)
  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  @ApiNotFoundResponse({ description: 'Appointment not found' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.findById(id, currentUser);
  }

  @Patch(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @Roles(...APPOINTMENT_WRITE_ROLES)
  @ApiOperation({ summary: 'Confirm appointment (SCHEDULED → CONFIRMED)' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.confirm(id, currentUser);
  }

  @Patch(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  @Roles(...APPOINTMENT_WRITE_ROLES)
  @ApiOperation({
    summary: 'Reschedule appointment',
    description: 'Changes date/time and optionally barber or duration with conflict checks.',
  })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  @ApiConflictResponse({ description: 'Barber time slot conflict' })
  @ApiBadRequestResponse({ description: 'Outside business hours or invalid status' })
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.reschedule(id, dto, currentUser);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(...APPOINTMENT_WRITE_ROLES)
  @ApiOperation({ summary: 'Cancel appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.cancel(id, dto, currentUser);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Roles(...APPOINTMENT_WRITE_ROLES)
  @ApiOperation({ summary: 'Complete appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteAppointmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.complete(id, dto, currentUser);
  }

  @Patch(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @Roles(...APPOINTMENT_WRITE_ROLES)
  @ApiOperation({ summary: 'Mark appointment as no-show' })
  @ApiParam({ name: 'id', description: 'Appointment UUID' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.markNoShow(id, currentUser);
  }
}
