export interface JwtPayload {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
}

export interface AuthenticatedUserMembership {
  barbershopId: string;
  barbershopSlug: string;
  roleSlug: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  memberships: AuthenticatedUserMembership[];
}
