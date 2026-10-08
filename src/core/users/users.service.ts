import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { paginate, Paginated } from '@common/dto/pagination.dto';
import { PasswordHasher } from '@common/security/password-hasher';
import { AuthenticatedUser } from '@common/types/authenticated-user';
import { AuditAction } from '@core/audit/audit.constants';
import { AuditService } from '@core/audit/audit.service';
import {
  CreateUserDto,
  QueryUsersDto,
  RoleResponseDto,
  UpdateUserDto,
  UserResponseDto,
} from '@core/users/dto/user.dto';
import { SystemRole } from '@core/users/system-roles';
import { RolesRepository, UsersRepository, UserWithRole } from '@core/users/users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly auditService: AuditService,
  ) {}

  async listRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.rolesRepository.findAll();
    return roles.map((role) => ({
      key: role.key,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    }));
  }

  async list(query: QueryUsersDto): Promise<Paginated<UserResponseDto>> {
    const [users, total] = await this.usersRepository.findMany(query);
    return paginate(users.map(toUserResponse), total, query);
  }

  async findById(id: string): Promise<UserResponseDto> {
    return toUserResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser): Promise<UserResponseDto> {
    const email = dto.email.toLowerCase();

    if (await this.usersRepository.emailInUse(email)) {
      throw new ConflictException('Email is already registered');
    }

    const role = await this.resolveAssignableRole(dto.role, actor);
    const user = await this.usersRepository.create({
      name: dto.name,
      email,
      passwordHash: await this.passwordHasher.hash(dto.password),
      roleId: role.id,
    });

    await this.auditService.record({
      action: AuditAction.USER_CREATED,
      entity: 'user',
      entityId: user.id,
      metadata: { email, role: role.key },
    });

    return toUserResponse(user);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser): Promise<UserResponseDto> {
    const current = await this.getOrThrow(id);

    if (current.role.key === SystemRole.OWNER && actor.role !== SystemRole.OWNER) {
      throw new ForbiddenException('Only an owner can modify another owner');
    }

    const role = dto.role ? await this.resolveAssignableRole(dto.role, actor) : undefined;

    if (role && current.id === actor.id && role.key !== current.role.key) {
      throw new BadRequestException('You cannot change your own role');
    }

    const user = await this.usersRepository.update(id, { name: dto.name, roleId: role?.id });

    await this.auditService.record({
      action: AuditAction.USER_UPDATED,
      entity: 'user',
      entityId: id,
      metadata: { fields: Object.keys(dto) },
    });

    if (role && role.key !== current.role.key) {
      await this.auditService.record({
        action: AuditAction.USER_ROLE_CHANGED,
        entity: 'user',
        entityId: id,
        metadata: { from: current.role.key, to: role.key },
      });
    }

    return toUserResponse(user);
  }

  async setActive(
    id: string,
    isActive: boolean,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const current = await this.getOrThrow(id);

    if (!isActive && current.id === actor.id) {
      throw new BadRequestException('You cannot deactivate yourself');
    }

    if (current.role.key === SystemRole.OWNER && actor.role !== SystemRole.OWNER) {
      throw new ForbiddenException('Only an owner can change the status of another owner');
    }

    const user = await this.usersRepository.update(id, { isActive });

    if (!isActive) {
      await this.usersRepository.revokeRefreshTokens(id);
    }

    await this.auditService.record({
      action: isActive ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED,
      entity: 'user',
      entityId: id,
    });

    return toUserResponse(user);
  }

  private async getOrThrow(id: string): Promise<UserWithRole> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async resolveAssignableRole(key: string, actor: AuthenticatedUser): Promise<Role> {
    const role = await this.rolesRepository.findByKey(key.toUpperCase());

    if (!role) {
      throw new BadRequestException(`Role "${key}" does not exist`);
    }

    if (role.key === SystemRole.OWNER && actor.role !== SystemRole.OWNER) {
      throw new ForbiddenException('Only an owner can assign the OWNER role');
    }

    return role;
  }
}

function toUserResponse(user: UserWithRole): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.key,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
