import { BusinessType } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  businessType: BusinessType;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: string;
  /** User session version at issuance; tokens with an outdated version are rejected. */
  sv: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}
