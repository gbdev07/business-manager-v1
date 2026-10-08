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
import { CustomersService } from '@core/customers/customers.service';
import {
  CreateCustomerDto,
  CustomerHistoryResponseDto,
  CustomerResponseDto,
  PaginatedCustomersDto,
  QueryCustomersDto,
  UpdateCustomerDto,
} from '@core/customers/dto/customer.dto';

@ApiTags('Core · Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions(CorePermission.CUSTOMERS_READ)
  @ApiOkResponse({ type: PaginatedCustomersDto })
  list(@Query() query: QueryCustomersDto): Promise<PaginatedCustomersDto> {
    return this.customersService.list(query);
  }

  @Get(':id')
  @RequirePermissions(CorePermission.CUSTOMERS_READ)
  @ApiOkResponse({ type: CustomerResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerResponseDto> {
    return this.customersService.findById(id);
  }

  @Get(':id/history')
  @RequirePermissions(CorePermission.CUSTOMERS_READ)
  @ApiOperation({ summary: 'Customer history (sales, payments and subscriptions)' })
  @ApiOkResponse({ type: CustomerHistoryResponseDto })
  history(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerHistoryResponseDto> {
    return this.customersService.history(id);
  }

  @Post()
  @RequirePermissions(CorePermission.CUSTOMERS_MANAGE)
  @ApiCreatedResponse({ type: CustomerResponseDto })
  create(@Body() dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(CorePermission.CUSTOMERS_MANAGE)
  @ApiOkResponse({ type: CustomerResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(id, dto);
  }

  @Patch(':id/activate')
  @RequirePermissions(CorePermission.CUSTOMERS_MANAGE)
  @ApiOkResponse({ type: CustomerResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerResponseDto> {
    return this.customersService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @RequirePermissions(CorePermission.CUSTOMERS_MANAGE)
  @ApiOkResponse({ type: CustomerResponseDto })
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerResponseDto> {
    return this.customersService.setActive(id, false);
  }
}
