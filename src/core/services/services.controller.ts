import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CorePermission } from '@common/auth/permissions';
import { RequirePermissions } from '@common/decorators/auth.decorators';
import {
  CreateServiceDto,
  PaginatedServicesDto,
  QueryServicesDto,
  ServiceResponseDto,
  UpdateServiceDto,
} from '@core/services/dto/service.dto';
import { ServicesService } from '@core/services/services.service';

@ApiTags('Core · Services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @RequirePermissions(CorePermission.CATALOG_READ)
  @ApiOkResponse({ type: PaginatedServicesDto })
  list(@Query() query: QueryServicesDto): Promise<PaginatedServicesDto> {
    return this.servicesService.list(query);
  }

  @Get(':id')
  @RequirePermissions(CorePermission.CATALOG_READ)
  @ApiOkResponse({ type: ServiceResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceResponseDto> {
    return this.servicesService.findById(id);
  }

  @Post()
  @RequirePermissions(CorePermission.CATALOG_MANAGE)
  @ApiCreatedResponse({ type: ServiceResponseDto })
  create(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    return this.servicesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(CorePermission.CATALOG_MANAGE)
  @ApiOkResponse({ type: ServiceResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.servicesService.update(id, dto);
  }
}
