import { UserResponseDto } from '@users/dto/user-response.dto';

type UserWithMemberships = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  memberships: {
    isActive: boolean;
    barbershop: { id: string; slug: string };
    role: { slug: string };
  }[];
};

export function mapUserToResponse(user: UserWithMemberships): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    isActive: user.isActive,
    isSuperAdmin: user.isSuperAdmin,
    memberships: user.memberships.map((membership) => ({
      barbershopId: membership.barbershop.id,
      barbershopSlug: membership.barbershop.slug,
      roleSlug: membership.role.slug,
      isActive: membership.isActive,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const userInclude = {
  memberships: {
    where: { deletedAt: null },
    include: {
      barbershop: { select: { id: true, slug: true } },
      role: { select: { slug: true } },
    },
  },
} as const;
