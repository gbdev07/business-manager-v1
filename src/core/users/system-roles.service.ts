import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { RolesRepository } from '@core/users/users.repository';
import { buildSystemRoles, RolePermissionContribution } from '@core/users/system-roles';

/**
 * Keeps the platform-wide system roles in sync with the code on every boot.
 * Business modules contribute permissions in onModuleInit, which Nest guarantees
 * runs before any onApplicationBootstrap hook.
 */
@Injectable()
export class SystemRolesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemRolesService.name);
  private readonly contributions: RolePermissionContribution[] = [];

  constructor(private readonly rolesRepository: RolesRepository) {}

  contribute(contribution: RolePermissionContribution): void {
    this.contributions.push(contribution);
  }

  async onApplicationBootstrap(): Promise<void> {
    const roles = buildSystemRoles(this.contributions);
    await this.rolesRepository.upsertSystemRoles(roles);
    this.logger.log(`System roles synchronized: ${roles.map((role) => role.key).join(', ')}`);
  }
}
