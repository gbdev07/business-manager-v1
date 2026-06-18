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
| JWT | Authentication (configured, not implemented) |
| Swagger | API documentation |
| Config Module | Environment configuration |
| Class Validator | DTO validation |
| ESLint + Prettier | Code quality |

## Project structure

```
src/
├── auth/           # Authentication module (JWT configured)
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

### 4. Start the application

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

## Available endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Application & database health |
| GET | `/api/v1/auth/status` | Auth module status |
| GET | `/api/v1/users/status` | Users module status |
| GET | `/docs` | Swagger UI |

## Scripts

```bash
npm run start:dev          # Development with hot reload
npm run build              # Production build
npm run start:prod         # Run production build
npm run lint               # ESLint
npm run format             # Prettier
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Create & apply migrations
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

## Global providers

- **ValidationPipe** — whitelist, transform, forbid unknown properties
- **GlobalExceptionFilter** — standardized error responses
- **AppLogger** — structured application logger
- **PrismaService** — global database access

## Production Docker

Build and run the production image:

```bash
docker build -t business-manager-api .
docker run -p 3000:3000 --env-file .env business-manager-api
```

The production container runs `prisma migrate deploy` before starting the server.

## Next steps

- Implement authentication flows (register, login, refresh)
- Add business domain modules
- Configure guards and role-based access control
- Add unit and e2e tests
