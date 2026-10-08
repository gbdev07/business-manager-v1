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
  CreateSaleDto,
  PaginatedSalesDto,
  QuerySalesDto,
  SaleResponseDto,
} from '@core/sales/dto/sale.dto';
import { SalesService } from '@core/sales/sales.service';

@ApiTags('Core · Sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @RequirePermissions(CorePermission.SALES_READ)
  @ApiOkResponse({ type: PaginatedSalesDto })
  list(@Query() query: QuerySalesDto): Promise<PaginatedSalesDto> {
    return this.salesService.list(query);
  }

  @Get(':id')
  @RequirePermissions(CorePermission.SALES_READ)
  @ApiOkResponse({ type: SaleResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<SaleResponseDto> {
    return this.salesService.findById(id);
  }

  @Post()
  @RequirePermissions(CorePermission.SALES_MANAGE)
  @ApiOperation({ summary: 'Register a completed sale of products and/or services' })
  @ApiCreatedResponse({ type: SaleResponseDto })
  create(@Body() dto: CreateSaleDto): Promise<SaleResponseDto> {
    return this.salesService.create(dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions(CorePermission.SALES_MANAGE)
  @ApiOkResponse({ type: SaleResponseDto })
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<SaleResponseDto> {
    return this.salesService.cancel(id);
  }
}
