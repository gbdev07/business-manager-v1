import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CorePermission } from '@common/auth/permissions';
import { RequirePermissions } from '@common/decorators/auth.decorators';
import {
  CreateProductDto,
  PaginatedProductsDto,
  ProductResponseDto,
  QueryProductsDto,
  UpdateProductDto,
} from '@core/products/dto/product.dto';
import { ProductsService } from '@core/products/products.service';

@ApiTags('Core · Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions(CorePermission.CATALOG_READ)
  @ApiOkResponse({ type: PaginatedProductsDto })
  list(@Query() query: QueryProductsDto): Promise<PaginatedProductsDto> {
    return this.productsService.list(query);
  }

  @Get(':id')
  @RequirePermissions(CorePermission.CATALOG_READ)
  @ApiOkResponse({ type: ProductResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.productsService.findById(id);
  }

  @Post()
  @RequirePermissions(CorePermission.CATALOG_MANAGE)
  @ApiCreatedResponse({ type: ProductResponseDto })
  create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(CorePermission.CATALOG_MANAGE)
  @ApiOkResponse({ type: ProductResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto);
  }
}
