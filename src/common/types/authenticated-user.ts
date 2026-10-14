import { BusinessType } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  businessType: BusinessType;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  /** Refresh-token id of this session. Present on the request user; omitted from API responses. */
  sessionId?: string;
}

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: string;
  /** User session version at issuance; tokens with an outdated version are rejected. */
  sv: number;
  /** Refresh-token id. Revoking that row rejects the access token without touching other sessions. */
  sid: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}
