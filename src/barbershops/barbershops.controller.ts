import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { BarbershopsService } from '@barbershops/barbershops.service';
import {
  BARBERSHOP_CREATE_ROLES,
  BARBERSHOP_READ_ROLES,
  BARBERSHOP_WRITE_ROLES,
} from '@barbershops/constants/barbershop-roles.constants';
import {
  BarbershopResponseDto,
  BarbershopSettingsResponseDto,
} from '@barbershops/dto/barbershop-response.dto';
import { CreateBarbershopDto } from '@barbershops/dto/create-barbershop.dto';
import { PatchBarbershopSettingsDto } from '@barbershops/dto/patch-barbershop-settings.dto';
import { UpdateBarbershopDto } from '@barbershops/dto/update-barbershop.dto';

@ApiTags('Barbershops')
@ApiBearerAuth()
@Controller('barbershops')
export class BarbershopsController {
  constructor(private readonly barbershopsService: BarbershopsService) {}

  @Post()
  @Roles(...BARBERSHOP_CREATE_ROLES)
  @ApiOperation({
    summary: 'Create a barbershop',
    description:
      'Creates a new barbershop and assigns the authenticated user as owner. Multi-tenant scoped.',
  })
  @ApiCreatedResponse({ type: BarbershopResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  create(
    @Body() dto: CreateBarbershopDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<BarbershopResponseDto> {
    return this.barbershopsService.create(dto, currentUser);
  }

  @Get()
  @Roles(...BARBERSHOP_READ_ROLES)
  @ApiOperation({
    summary: 'List accessible barbershops',
    description: 'Returns only barbershops the authenticated user belongs to.',
  })
  @ApiOkResponse({ type: BarbershopResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  findAll(@CurrentUser() currentUser: AuthenticatedUser): Promise<BarbershopResponseDto[]> {
    return this.barbershopsService.findAll(currentUser);
  }

  @Get(':id/settings')
  @Roles(...BARBERSHOP_READ_ROLES)
  @ApiOperation({
    summary: 'Get barbershop settings',
    description: 'Returns logo, timezone and operating hours.',
  })
  @ApiParam({ name: 'id', description: 'Barbershop UUID' })
  @ApiOkResponse({ type: BarbershopSettingsResponseDto })
  @ApiNotFoundResponse({ description: 'Barbershop not found' })
  @ApiForbiddenResponse({ description: 'No access to this barbershop' })
  getSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<BarbershopSettingsResponseDto> {
    return this.barbershopsService.getSettings(id, currentUser);
  }

  @Get(':id')
  @Roles(...BARBERSHOP_READ_ROLES)
  @ApiOperation({ summary: 'Get barbershop by ID' })
  @ApiParam({ name: 'id', description: 'Barbershop UUID' })
  @ApiOkResponse({ type: BarbershopResponseDto })
  @ApiNotFoundResponse({ description: 'Barbershop not found' })
  @ApiForbiddenResponse({ description: 'No access to this barbershop' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<BarbershopResponseDto> {
    return this.barbershopsService.findById(id, currentUser);
  }

  @Patch(':id/settings')
  @Roles(...BARBERSHOP_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update barbershop settings',
    description: 'Updates logo, timezone and operating hours.',
  })
  @ApiParam({ name: 'id', description: 'Barbershop UUID' })
  @ApiOkResponse({ type: BarbershopSettingsResponseDto })
  @ApiNotFoundResponse({ description: 'Barbershop not found' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchBarbershopSettingsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<BarbershopSettingsResponseDto> {
    return this.barbershopsService.updateSettings(id, dto, currentUser);
  }

  @Patch(':id')
  @Roles(...BARBERSHOP_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update barbershop data',
    description: 'Updates name, contact info and address.',
  })
  @ApiParam({ name: 'id', description: 'Barbershop UUID' })
  @ApiOkResponse({ type: BarbershopResponseDto })
  @ApiNotFoundResponse({ description: 'Barbershop not found' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBarbershopDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<BarbershopResponseDto> {
    return this.barbershopsService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin', 'owner')
  @ApiOperation({
    summary: 'Deactivate barbershop (soft delete)',
    description: 'Only super_admin or owner can deactivate a barbershop.',
  })
  @ApiParam({ name: 'id', description: 'Barbershop UUID' })
  @ApiOkResponse({ description: 'Barbershop deactivated' })
  @ApiNotFoundResponse({ description: 'Barbershop not found' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string; barbershop: BarbershopResponseDto }> {
    return this.barbershopsService.deactivate(id, currentUser);
  }
}
