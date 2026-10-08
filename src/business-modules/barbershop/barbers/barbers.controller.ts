import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { BusinessModule, RequirePermissions } from '@common/decorators/auth.decorators';
import { BarbershopPermission } from '@modules/barbershop/barbershop.permissions';
import { BarbersService } from '@modules/barbershop/barbers/barbers.service';
import {
  BarberResponseDto,
  CreateBarberDto,
  PaginatedBarbersDto,
  QueryBarbersDto,
  UpdateBarberDto,
} from '@modules/barbershop/barbers/dto/barber.dto';

@ApiTags('Barbershop · Barbers')
@ApiBearerAuth()
@BusinessModule(BusinessType.BARBERSHOP)
@Controller('barbershop/barbers')
export class BarbersController {
  constructor(private readonly barbersService: BarbersService) {}

  @Get()
  @RequirePermissions(BarbershopPermission.BARBERS_READ)
  @ApiOkResponse({ type: PaginatedBarbersDto })
  list(@Query() query: QueryBarbersDto): Promise<PaginatedBarbersDto> {
    return this.barbersService.list(query);
  }

  @Get(':id')
  @RequirePermissions(BarbershopPermission.BARBERS_READ)
  @ApiOkResponse({ type: BarberResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<BarberResponseDto> {
    return this.barbersService.findById(id);
  }

  @Post()
  @RequirePermissions(BarbershopPermission.BARBERS_MANAGE)
  @ApiCreatedResponse({ type: BarberResponseDto })
  create(@Body() dto: CreateBarberDto): Promise<BarberResponseDto> {
    return this.barbersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(BarbershopPermission.BARBERS_MANAGE)
  @ApiOkResponse({ type: BarberResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBarberDto,
  ): Promise<BarberResponseDto> {
    return this.barbersService.update(id, dto);
  }

  @Patch(':id/activate')
  @RequirePermissions(BarbershopPermission.BARBERS_MANAGE)
  @ApiOkResponse({ type: BarberResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<BarberResponseDto> {
    return this.barbersService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @RequirePermissions(BarbershopPermission.BARBERS_MANAGE)
  @ApiOkResponse({ type: BarberResponseDto })
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<BarberResponseDto> {
    return this.barbersService.setActive(id, false);
  }
}
