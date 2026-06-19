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
  ApiConflictResponse,
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
import { Public } from '@auth/decorators/public.decorator';
import { Roles } from '@auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { USER_READ_ROLES, USER_WRITE_ROLES } from '@users/constants/user-roles.constants';
import { CreateUserDto } from '@users/dto/create-user.dto';
import { DeactivateUserResponseDto } from '@users/dto/deactivate-user-response.dto';
import { PaginatedUsersResponseDto } from '@users/dto/paginated-users-response.dto';
import { QueryUsersDto } from '@users/dto/query-users.dto';
import { UpdateUserDto } from '@users/dto/update-user.dto';
import { UserResponseDto } from '@users/dto/user-response.dto';
import { UsersService } from '@users/users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Users module health check' })
  @ApiOkResponse({ description: 'Users module is ready' })
  status(): { module: string; status: string } {
    return this.usersService.getStatus();
  }

  @Get('me')
  @Roles(...USER_READ_ROLES)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({ description: 'Current user profile', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Post()
  @Roles(...USER_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Requires ADMIN (super_admin, owner) or MANAGER role. Assigns the user to a barbershop with the specified role.',
  })
  @ApiCreatedResponse({ description: 'User created', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Email already in use' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto, currentUser);
  }

  @Get()
  @Roles(...USER_READ_ROLES)
  @ApiOperation({
    summary: 'List users with pagination',
    description:
      'Requires ADMIN, MANAGER or BARBER role. Supports search by name and email. Scoped to accessible barbershops.',
  })
  @ApiOkResponse({ description: 'Paginated user list', type: PaginatedUsersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  findAll(
    @Query() query: QueryUsersDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedUsersResponseDto> {
    return this.usersService.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles(...USER_READ_ROLES)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Requires ADMIN, MANAGER or BARBER role within the same barbershop.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiOkResponse({ description: 'User found', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.findById(id, currentUser);
  }

  @Patch(':id')
  @Roles(...USER_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update user',
    description: 'Requires ADMIN (super_admin, owner) or MANAGER role.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiOkResponse({ description: 'User updated', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Email already in use' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Roles(...USER_WRITE_ROLES)
  @ApiOperation({
    summary: 'Deactivate user (soft delete)',
    description:
      'Requires ADMIN (super_admin, owner) or MANAGER role. Sets deletedAt, revokes sessions and deactivates memberships.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiOkResponse({ description: 'User deactivated', type: DeactivateUserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or self-deactivation' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<DeactivateUserResponseDto> {
    return this.usersService.deactivate(id, currentUser);
  }
}
