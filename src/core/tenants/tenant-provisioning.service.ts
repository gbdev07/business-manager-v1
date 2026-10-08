import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Tenant, User } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PasswordHasher } from '@common/security/password-hasher';
import { CoreEvent, TenantCreatedEvent } from '@core/events/core.events';
import { RegisterTenantDto } from '@core/tenants/dto/tenant.dto';
import { slugify } from '@core/tenants/tenant.mapper';
import { TenantsRepository } from '@core/tenants/tenants.repository';
import { SystemRole } from '@core/users/system-roles';

/** Creates a new business (tenant) together with its OWNER user. */
@Injectable()
export class TenantProvisioningService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async provision(dto: RegisterTenantDto): Promise<{ tenant: Tenant; owner: User }> {
    const email = dto.email.toLowerCase();

    if (await this.tenantsRepository.emailInUse(email)) {
      throw new ConflictException('Email is already registered');
    }

    const ownerRole = await this.tenantsRepository.findRoleByKey(SystemRole.OWNER);
    if (!ownerRole) {
      throw new InternalServerErrorException('System roles are not seeded');
    }

    const result = await this.tenantsRepository.createWithOwner({
      tenant: {
        name: dto.businessName,
        slug: await this.generateUniqueSlug(dto.businessName),
        businessType: dto.businessType,
        email,
        phone: dto.phone,
        timezone: dto.timezone,
      },
      owner: {
        name: dto.ownerName,
        email,
        passwordHash: await this.passwordHasher.hash(dto.password),
        roleId: ownerRole.id,
      },
    });

    await this.eventEmitter.emitAsync(
      CoreEvent.TENANT_CREATED,
      new TenantCreatedEvent(result.tenant.id, result.tenant.businessType),
    );

    return result;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'business';

    if (!(await this.tenantsRepository.slugExists(base))) {
      return base;
    }

    return `${base}-${randomBytes(3).toString('hex')}`;
  }
}
