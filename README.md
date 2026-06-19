# Business Manager — Backend SaaS

Backend SaaS foundation built with NestJS, TypeScript, Prisma, and PostgreSQL.

## Stack

| Technology | Purpose |
|---|---|
| NestJS | Application framework |
| TypeScript | Language |
| Prisma | ORM |
| PostgreSQL | Database |
| Docker | Containerization |
| JWT | Authentication |
| Swagger | API documentation |
| Config Module | Environment configuration |
| Class Validator | DTO validation |
| ESLint + Prettier | Code quality |

## Project structure

```
src/
├── auth/           # Authentication (login, refresh, JWT guards)
├── barbers/        # Barbers CRUD & work schedule
├── barbershops/    # Barbershop CRUD & settings
├── appointments/   # Scheduling & status transitions
├── customers/      # Customers CRUD & history
├── subscriptions/  # Plans & enrollments
├── payments/       # Charges & payment provider abstraction
├── common/         # Global filters, logger
├── config/         # Configuration & env validation
├── health/         # Health check endpoint
├── prisma/         # Global PrismaService
├── users/          # Users module
├── app.module.ts
└── main.ts
```

## Prerequisites

- Node.js 22+
- npm 10+
- Docker & Docker Compose (optional, recommended)

## Getting started

### 1. Clone and install

```bash
cp .env.example .env
npm install
```

### 2. Start PostgreSQL

**With Docker (recommended):**

```bash
docker compose up postgres -d
```

**Or use your own PostgreSQL instance** and update `DATABASE_URL` in `.env`.

### 3. Run migrations

```bash
npm run prisma:migrate
```

### 4. Seed initial data

```bash
npm run prisma:seed
```

Creates system roles, a super admin user, and a demo barbershop.

### 5. Start the application

**Local development:**

```bash
npm run start:dev
```

**Full stack with Docker:**

```bash
docker compose up
```

## Environment variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment | `development` |
| `PORT` | HTTP port | `3000` |
| `API_PREFIX` | Global route prefix | `api/v1` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `SWAGGER_ENABLED` | Enable Swagger UI | `true` |
| `SWAGGER_PATH` | Swagger route | `docs` |
| `SEED_ADMIN_EMAIL` | Admin user email for seed | `admin@business-manager.com` |
| `SEED_ADMIN_PASSWORD` | Admin user password for seed | `Admin@123!` |
| `PAYMENT_DEFAULT_PROVIDER` | Default payment gateway (`MANUAL`, `ASAAS`, `MERCADO_PAGO`) | `MANUAL` |

## Database schema

Multi-tenant barbershop management model. `Barbershop` is the tenant root — all domain data is scoped by `barbershopId`.

| Entity | Purpose |
|---|---|
| `User` | Platform users (login, soft delete) |
| `Role` | RBAC roles with JSON permissions |
| `BarbershopMember` | User ↔ Barbershop ↔ Role (multi-tenant access) |
| `Barbershop` | Tenant root (soft delete) |
| `Barber` | Barbers linked to a barbershop (soft delete) |
| `Customer` | Customers per barbershop (soft delete) |
| `Appointment` | Scheduled services (soft delete + status) |
| `Subscription` | Plans (`PLAN`) and customer enrollments (`ENROLLMENT`) |
| `Payment` | Financial records (immutable — no soft delete) |

**Payment providers** (`PaymentProviderName`):

| Provider | Status |
|---|---|
| `MANUAL` | Active — local charges without external gateway |
| `ASAAS` | Stub — architecture ready, integration pending |
| `MERCADO_PAGO` | Stub — architecture ready, integration pending |

**Default admin (after seed):**

- Email: `admin@business-manager.com`
- Password: `Admin@123!`

## Available endpoints

All routes below use the global prefix `/api/v1` unless noted. Protected routes require `Authorization: Bearer <access_token>`.

### Health & docs

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Application & database health |
| GET | `/docs` | Public | Swagger UI |

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Login with email and password |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/logout` | Bearer | Revoke refresh token |
| GET | `/api/v1/auth/status` | Public | Auth module status |

### Payments

Architecture uses a `PaymentProvider` abstraction (`createCharge`, `getCharge`, `cancelCharge`) so Asaas and Mercado Pago can be plugged in later. Only `MANUAL` is fully implemented today.

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/v1/payments/providers` | super_admin, owner, manager, receptionist, barber | List registered providers and default gateway |
| POST | `/api/v1/payments/charges` | super_admin, owner, manager, receptionist | Create a charge (persists locally + delegates to provider) |
| GET | `/api/v1/payments/charges` | super_admin, owner, manager, receptionist, barber | List charges with pagination and filters |
| GET | `/api/v1/payments/charges/:id` | super_admin, owner, manager, receptionist, barber | Get charge by ID (syncs status from provider when `externalId` exists) |
| PATCH | `/api/v1/payments/charges/:id/cancel` | super_admin, owner, manager, receptionist | Cancel a charge |

#### `GET /payments/providers`

**Response `200`:**

```json
{
  "available": ["MANUAL", "ASAAS", "MERCADO_PAGO"],
  "defaultProvider": "MANUAL",
  "note": "ASAAS and MERCADO_PAGO providers are registered as stubs — implement gateway clients when ready."
}
```

#### `POST /payments/charges`

**Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `barbershopId` | UUID | Yes | Tenant barbershop |
| `customerId` | UUID | No | Linked customer |
| `appointmentId` | UUID | No | Linked appointment |
| `subscriptionId` | UUID | No | Linked subscription |
| `amount` | number | Yes | Charge amount (min `0.01`) |
| `currency` | string | No | Default `BRL` |
| `type` | enum | No | `APPOINTMENT`, `SUBSCRIPTION`, `SUBSCRIPTION_RENEWAL`, `OTHER` |
| `method` | enum | No | `CASH`, `PIX`, `CREDIT_CARD`, `DEBIT_CARD`, `BANK_TRANSFER`, `OTHER` |
| `provider` | enum | No | `MANUAL` (default), `ASAAS`, `MERCADO_PAGO` |
| `description` | string | No | Human-readable description |
| `dueDate` | ISO date | No | Payment due date |

**Response `201`:** charge object with `id`, `status`, `provider`, `externalId`, `checkoutUrl`, etc.

#### `GET /payments/charges`

**Query params:**

| Param | Type | Description |
|---|---|---|
| `barbershopId` | UUID | Filter by barbershop |
| `customerId` | UUID | Filter by customer |
| `status` | enum | `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `CANCELLED` |
| `provider` | enum | `MANUAL`, `ASAAS`, `MERCADO_PAGO` |
| `type` | enum | Payment type |
| `page` | number | Page number (default `1`) |
| `limit` | number | Page size (default `10`, max `100`) |

**Response `200`:**

```json
{
  "data": [ /* ChargeResponseDto[] */ ],
  "total": 20,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

#### `GET /payments/charges/:id`

**Response `200`:** single charge object. When the payment has an `externalId`, status is refreshed from the provider before returning.

#### `PATCH /payments/charges/:id/cancel`

**Body (optional):**

```json
{
  "reason": "Cliente desistiu da compra"
}
```

**Response `200`:** updated charge with `status: CANCELLED`.

**Errors:**

- `400` — payment status does not allow cancellation (only `PENDING` and `PAID`)
- `404` — payment not found
- `501` — provider is `ASAAS` or `MERCADO_PAGO` (not implemented yet)

## Scripts

```bash
npm run start:dev          # Development with hot reload
npm run build              # Production build
npm run start:prod         # Run production build
npm run lint               # ESLint
npm run format             # Prettier
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Create & apply migrations
npm run prisma:seed        # Seed roles, admin user, demo data
npm run prisma:studio      # Prisma Studio GUI
```

## Import aliases

Configured in `tsconfig.json`:

| Alias | Path |
|---|---|
| `@/*` | `src/*` |
| `@common/*` | `src/common/*` |
| `@auth/*` | `src/auth/*` |
| `@users/*` | `src/users/*` |
| `@config/*` | `src/config/*` |
| `@prisma/*` | `src/prisma/*` |
| `@payments/*` | `src/payments/*` |

## Global providers

- **ValidationPipe** — whitelist, transform, forbid unknown properties
- **GlobalExceptionFilter** — standardized error responses
- **AppLogger** — structured application logger
- **PrismaService** — global database access
- **JwtAuthGuard** — global JWT authentication (routes marked `@Public()` are exempt)
- **RolesGuard** — role-based access control via `@Roles()`

## Production Docker

Build and run the production image:

```bash
docker build -t business-manager-api .
docker run -p 3000:3000 --env-file .env business-manager-api
```

The production container runs `prisma migrate deploy` before starting the server.

## Next steps

- Implement Asaas and Mercado Pago gateway clients in `PaymentProvider` stubs
- Wire subscription auto-renewal to `PaymentsService.createCharge()`
- Add webhook handlers for payment status updates
- Add unit and e2e tests
