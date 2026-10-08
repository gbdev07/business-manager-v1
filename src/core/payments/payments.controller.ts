import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CorePermission } from '@common/auth/permissions';
import { RequirePermissions } from '@common/decorators/auth.decorators';
import {
  ConfirmPaymentDto,
  CreatePaymentDto,
  PaginatedPaymentsDto,
  PaymentGatewayStatusDto,
  PaymentResponseDto,
  QueryPaymentsDto,
} from '@core/payments/dto/payment.dto';
import { PaymentsService } from '@core/payments/payments.service';

@ApiTags('Core · Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('gateways')
  @RequirePermissions(CorePermission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Registered payment gateways and their availability' })
  @ApiOkResponse({ type: [PaymentGatewayStatusDto] })
  listGateways(): PaymentGatewayStatusDto[] {
    return this.paymentsService.listGateways();
  }

  @Get()
  @RequirePermissions(CorePermission.PAYMENTS_READ)
  @ApiOkResponse({ type: PaginatedPaymentsDto })
  list(@Query() query: QueryPaymentsDto): Promise<PaginatedPaymentsDto> {
    return this.paymentsService.list(query);
  }

  @Get(':id')
  @RequirePermissions(CorePermission.PAYMENTS_READ)
  @ApiOkResponse({ type: PaymentResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentResponseDto> {
    return this.paymentsService.findById(id);
  }

  @Post()
  @RequirePermissions(CorePermission.PAYMENTS_MANAGE)
  @ApiOperation({ summary: 'Create a charge through the selected gateway' })
  @ApiCreatedResponse({ type: PaymentResponseDto })
  create(@Body() dto: CreatePaymentDto): Promise<PaymentResponseDto> {
    return this.paymentsService.create(dto);
  }

  @Patch(':id/confirm')
  @RequirePermissions(CorePermission.PAYMENTS_MANAGE)
  @ApiOperation({ summary: 'Confirm a manual payment as received' })
  @ApiOkResponse({ type: PaymentResponseDto })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.confirm(id, dto);
  }

  @Post(':id/sync')
  @RequirePermissions(CorePermission.PAYMENTS_MANAGE)
  @ApiOperation({ summary: 'Refresh the payment status from its gateway' })
  @ApiOkResponse({ type: PaymentResponseDto })
  sync(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentResponseDto> {
    return this.paymentsService.sync(id);
  }

  @Patch(':id/cancel')
  @RequirePermissions(CorePermission.PAYMENTS_MANAGE)
  @ApiOkResponse({ type: PaymentResponseDto })
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentResponseDto> {
    return this.paymentsService.cancel(id);
  }
}
