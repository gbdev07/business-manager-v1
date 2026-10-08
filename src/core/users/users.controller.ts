import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CorePermission } from '@common/auth/permissions';
import { CurrentUser, RequirePermissions } from '@common/decorators/auth.decorators';
import { AuthenticatedUser } from '@common/types/authenticated-user';
import {
  CreateUserDto,
  PaginatedUsersDto,
  QueryUsersDto,
  RoleResponseDto,
  UpdateUserDto,
  UserResponseDto,
} from '@core/users/dto/user.dto';
import { UsersService } from '@core/users/users.service';

@ApiTags('Core · Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('roles')
  @RequirePermissions(CorePermission.USERS_READ)
  @ApiOperation({ summary: 'List available roles and their permissions' })
  @ApiOkResponse({ type: [RoleResponseDto] })
  listRoles(): Promise<RoleResponseDto[]> {
    return this.usersService.listRoles();
  }

  @Get()
  @RequirePermissions(CorePermission.USERS_READ)
  @ApiOperation({ summary: 'List users of the current tenant' })
  @ApiOkResponse({ type: PaginatedUsersDto })
  list(@Query() query: QueryUsersDto): Promise<PaginatedUsersDto> {
    return this.usersService.list(query);
  }

  @Get(':id')
  @RequirePermissions(CorePermission.USERS_READ)
  @ApiOkResponse({ type: UserResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermissions(CorePermission.USERS_MANAGE)
  @ApiOperation({ summary: 'Create a user in the current tenant' })
  @ApiCreatedResponse({ type: UserResponseDto })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(CorePermission.USERS_MANAGE)
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, actor);
  }

  @Patch(':id/activate')
  @RequirePermissions(CorePermission.USERS_MANAGE)
  @ApiOkResponse({ type: UserResponseDto })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.setActive(id, true, actor);
  }

  @Patch(':id/deactivate')
  @RequirePermissions(CorePermission.USERS_MANAGE)
  @ApiOperation({ summary: 'Deactivate a user and revoke their refresh tokens' })
  @ApiOkResponse({ type: UserResponseDto })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.setActive(id, false, actor);
  }
}
