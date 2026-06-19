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
import { PAYMENT_READ_ROLES, PAYMENT_WRITE_ROLES } from '@payments/constants/payment.constants';
import {
  ChargeResponseDto,
  PaginatedChargesResponseDto,
  PaymentProvidersResponseDto,
} from '@payments/dto/charge-response.dto';
import { CancelChargeDto, CreateChargeDto } from '@payments/dto/create-charge.dto';
import { QueryChargesDto } from '@payments/dto/query-charges.dto';
import { PaymentsService } from '@payments/payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('providers')
  @Roles(...PAYMENT_READ_ROLES)
  @ApiOperation({
    summary: 'List available payment providers',
    description:
      'Shows registered providers and default gateway for future Asaas/Mercado Pago integration.',
  })
  @ApiOkResponse({ type: PaymentProvidersResponseDto })
  listProviders(): PaymentProvidersResponseDto {
    return this.paymentsService.listProviders();
  }

  @Post('charges')
  @Roles(...PAYMENT_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a charge',
    description:
      'Persists payment locally and delegates charge creation to the selected PaymentProvider.',
  })
  @ApiCreatedResponse({ type: ChargeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or provider not registered' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  createCharge(
    @Body() dto: CreateChargeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ChargeResponseDto> {
    return this.paymentsService.createCharge(dto, currentUser);
  }

  @Get('charges')
  @Roles(...PAYMENT_READ_ROLES)
  @ApiOperation({ summary: 'List charges with pagination and filters' })
  @ApiOkResponse({ type: PaginatedChargesResponseDto })
  findAllCharges(
    @Query() query: QueryChargesDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedChargesResponseDto> {
    return this.paymentsService.findAllCharges(query, currentUser);
  }

  @Get('charges/:id')
  @Roles(...PAYMENT_READ_ROLES)
  @ApiOperation({
    summary: 'Get charge by ID',
    description: 'Syncs status from provider when externalId is present.',
  })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiOkResponse({ type: ChargeResponseDto })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  getCharge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ChargeResponseDto> {
    return this.paymentsService.getCharge(id, currentUser);
  }

  @Patch('charges/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(...PAYMENT_WRITE_ROLES)
  @ApiOperation({
    summary: 'Cancel a charge',
    description: 'Cancels via PaymentProvider when integrated, otherwise updates local record.',
  })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiOkResponse({ type: ChargeResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payment status for cancellation' })
  cancelCharge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelChargeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ChargeResponseDto> {
    return this.paymentsService.cancelCharge(id, dto, currentUser);
  }
}
