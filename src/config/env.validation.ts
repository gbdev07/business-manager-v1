import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsOptional()
  @IsString()
  API_PREFIX?: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsOptional()
  @IsIn(['true', 'false'])
  SWAGGER_ENABLED?: string;

  @IsOptional()
  @IsString()
  SWAGGER_PATH?: string;

  @IsOptional()
  @IsIn(['MANUAL', 'ASAAS', 'MERCADO_PAGO', 'STRIPE'])
  PAYMENT_DEFAULT_PROVIDER?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  NOTIFICATION_DEV_LOG?: string;

  @IsOptional()
  @IsString()
  TRUST_PROXY?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  PASSWORD_RESET_URL?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  PASSWORD_RESET_TOKEN_TTL_MINUTES?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  PASSWORD_RESET_COOLDOWN_SECONDS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  PASSWORD_RATE_LIMIT_TTL_SECONDS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  PASSWORD_RATE_LIMIT_MAX?: number;

  @IsOptional()
  @IsString()
  EMAIL_FROM?: string;

  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT?: number;

  @IsOptional()
  @IsIn(['true', 'false'])
  SMTP_SECURE?: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  // `VAR=` (common in docker-compose `${VAR:-}`) means "not set", not an invalid value.
  const defined = Object.fromEntries(Object.entries(config).filter(([, value]) => value !== ''));
  const validatedConfig = plainToInstance(EnvironmentVariables, defined, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
