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
  ApiForbiddenResponse,
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
import { BarbersService } from '@barbers/barbers.service';
import { BARBER_READ_ROLES, BARBER_WRITE_ROLES } from '@barbers/constants/barber.constants';
import {
  BarberResponseDto,
  DeactivateBarberResponseDto,
  PaginatedBarbersResponseDto,
} from '@barbers/dto/barber-response.dto';
import { CreateBarberDto } from '@barbers/dto/create-barber.dto';
import { QueryBarbersDto } from '@barbers/dto/query-barbers.dto';
import { UpdateBarberDto } from '@barbers/dto/update-barber.dto';

@ApiTags('Barbers')
@ApiBearerAuth()
@Controller('barbers')
export class BarbersController {
  constructor(private readonly barbersService: BarbersService) {}

  @Post()
  @Roles(...BARBER_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a barber',
    description: 'Creates a barber linked to a barbershop. Requires owner or manager role.',
  })
  @ApiCreatedResponse({ type: BarberResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or invalid schedule' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Barbershop not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  create(
    @Body() dto: CreateBarberDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<BarberResponseDto> {
    return this.barbersService.create(dto, currentUser);
  }

  @Get()
  @Roles(...BARBER_READ_ROLES)
  @ApiOperation({
    summary: 'List barbers',
    description: 'Lists barbers scoped to accessible barbershops with pagination.',
  })
  @ApiOkResponse({ type: PaginatedBarbersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  findAll(
    @Query() query: QueryBarbersDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedBarbersResponseDto> {
    return this.barbersService.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles(...BARBER_READ_ROLES)
  @ApiOperation({ summary: 'Get barber by ID' })
  @ApiParam({ name: 'id', description: 'Barber UUID' })
  @ApiOkResponse({ type: BarberResponseDto })
  @ApiNotFoundResponse({ description: 'Barber not found' })
  @ApiForbiddenResponse({ description: 'No access to this barbershop' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<BarberResponseDto> {
    return this.barbersService.findById(id, currentUser);
  }

  @Patch(':id')
  @Roles(...BARBER_WRITE_ROLES)
  @ApiOperation({ summary: 'Update barber' })
  @ApiParam({ name: 'id', description: 'Barber UUID' })
  @ApiOkResponse({ type: BarberResponseDto })
  @ApiNotFoundResponse({ description: 'Barber not found' })
  @ApiBadRequestResponse({ description: 'Validation failed or invalid schedule' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBarberDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<BarberResponseDto> {
    return this.barbersService.update(id, dto, currentUser);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Roles(...BARBER_WRITE_ROLES)
  @ApiOperation({
    summary: 'Deactivate barber (soft delete)',
    description: 'Sets isActive to false and records deletedAt.',
  })
  @ApiParam({ name: 'id', description: 'Barber UUID' })
  @ApiOkResponse({ type: DeactivateBarberResponseDto })
  @ApiNotFoundResponse({ description: 'Barber not found' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<DeactivateBarberResponseDto> {
    return this.barbersService.deactivate(id, currentUser);
  }
}
