# Business Platform API

Plataforma SaaS **multi-tenant** para gestão de pequenas e médias empresas, construída com NestJS, Prisma e PostgreSQL.

> **A plataforma foi projetada para suportar múltiplos segmentos de negócio.**
> Barbearia é apenas o **primeiro** segmento implementado. Salões, varejo e prestadores de serviço
> serão adicionados como novos módulos, **sem alterar o core**.

---

## Sumário

- [Objetivo](#objetivo)
- [Arquitetura](#arquitetura)
  - [Core da plataforma](#core-da-plataforma)
  - [Business modules](#business-modules)
  - [Como core e módulos se comunicam](#como-core-e-módulos-se-comunicam)
  - [Multi-tenancy](#multi-tenancy)
  - [Autenticação e autorização](#autenticação-e-autorização)
  - [Decisão: Subscriptions](#decisão-subscriptions)
- [Tecnologias](#tecnologias)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como executar](#como-executar)
- [Configuração do .env](#configuração-do-env)
- [Docker](#docker)
- [Prisma e migrations](#prisma-e-migrations)
- [Seed](#seed)
- [Credenciais de desenvolvimento](#credenciais-de-desenvolvimento)
- [Swagger](#swagger)
- [Endpoints](#endpoints)
- [Testes](#testes)
- [Lint e formatação](#lint-e-formatação)
- [Como adicionar um novo segmento](#como-adicionar-um-novo-segmento)
- [Roadmap](#roadmap)

---

## Objetivo

Oferecer uma base única para gestão de negócios — clientes, catálogo, vendas, pagamentos, assinaturas,
notificações, dashboard e auditoria — sobre a qual cada segmento acrescenta apenas as regras que lhe
são próprias (agenda de barbeiros, comissões, etc.).

O conceito é **CORE DA PLATAFORMA + MÓDULOS ESPECÍFICOS POR SEGMENTO**.

---

## Arquitetura

```
                    ┌──────────────────────────────────────────────┐
  HTTP  ───────────▶│  Guards globais                               │
                    │  JwtAuth → TenantContext → BusinessModule →   │
                    │  Permissions                                  │
                    └──────────────┬───────────────────────────────┘
                                   ▼
        ┌──────────────────────────┴──────────────────────────┐
        │                                                     │
┌───────▼────────┐    eventos (EventEmitter)        ┌─────────▼──────────┐
│     CORE       │ ───────────────────────────────▶ │  BUSINESS MODULES  │
│ auth, users,   │                                  │  barbershop/       │
│ tenants,       │ ◀─── registries (dashboard,      │  (salon/, retail/  │
│ customers,     │      permissões de roles)        │   no futuro)       │
│ catalog, sales,│                                  │                    │
│ payments, ...  │ ◀─── serviços do core (uso)      │                    │
└───────┬────────┘                                  └─────────┬──────────┘
        │  Controller → Service → Repository (TenantScoped) → Prisma
        ▼                                                     ▼
                         PostgreSQL (shared schema + tenant_id)
```

Cada feature segue **Controller → Service → Repository → Prisma**:

- **Controllers** só recebem DTOs validados e devolvem DTOs de resposta (entidades Prisma nunca são expostas).
- **Services** contêm as regras de negócio.
- **Repositories** são os únicos que falam com o Prisma e aplicam o filtro de tenant.

### Core da plataforma

`src/core` contém tudo o que é **comum a qualquer segmento**. Não existe nenhuma regra de barbearia aqui.

| Módulo          | Responsabilidade |
| --------------- | ---------------- |
| `auth`          | Registro de empresa, login, refresh token com rotação, logout, `/auth/me` |
| `tenants`       | Dados da empresa, `businessType`, configurações genéricas (`settings`) |
| `users`         | Usuários do tenant e roles (`OWNER`, `ADMIN`, `MANAGER`, `EMPLOYEE`) |
| `customers`     | Clientes genéricos + histórico (vendas, pagamentos, assinaturas) |
| `services`      | Catálogo de serviços (preço, duração opcional) |
| `products`      | Catálogo de produtos simples (sem variações nem estoque) |
| `sales`         | Vendas de produtos/serviços com itens, desconto e cancelamento |
| `payments`      | Cobranças com abstração `PaymentProvider` (Manual, Asaas, Mercado Pago, Stripe) |
| `subscriptions` | Planos e assinaturas genéricas (ciclo, renovação, expiração, lembretes) |
| `notifications` | Abstração `NotificationProvider` (Email, WhatsApp, Push) |
| `dashboard`     | Métricas do core + métricas plugadas pelos módulos |
| `audit`         | Trilha de auditoria (login, usuários, vendas, pagamentos, assinaturas) |

**Pagamentos.** `PaymentProvider` define `createCharge`, `getCharge` e `cancelCharge`. Só o provider
`MANUAL` é funcional (pagamentos recebidos fora de gateway e confirmados via API). Asaas, Mercado Pago e
Stripe estão registrados, mas respondem `501 Not Implemented` e aparecem como `available: false` em
`GET /payments/gateways`. Integrar um gateway = implementar a classe correspondente em
`core/payments/providers/gateway.providers.ts`.

**Notificações.** `NotificationProvider` define `send(message)`. Os providers de Email, WhatsApp e Push
ainda não estão integrados; enquanto isso, com `NOTIFICATION_DEV_LOG=true` as mensagens são escritas no log.
Uma falha de notificação nunca desfaz a operação de negócio.

### Business modules

`src/business-modules/<segmento>` contém **apenas** as regras de um segmento. Hoje existe
`business-modules/barbershop`:

| Feature          | Regras |
| ---------------- | ------ |
| `settings`       | Horário de funcionamento por dia da semana |
| `barbers`        | Especialidades, status, dias/horário de trabalho, vínculo opcional com um usuário |
| `appointments`   | Status `SCHEDULED → CONFIRMED → COMPLETED` / `CANCELLED` / `NO_SHOW`, validação de horário de funcionamento, expediente do barbeiro e **conflito de agenda** (lock transacional por barbeiro) |
| `plan-benefits`  | Serviços incluídos em cada plano de assinatura e consumo no ciclo atual |
| `commissions`    | Regras por barbeiro/serviço/produto, percentual ou valor fixo; geração automática ao concluir atendimento ou venda; histórico e pagamento |
| `dashboard`      | Agendamentos, concluídos, cancelamentos, faltas, taxa de cancelamento, barbeiros ativos |
| `notifications`  | Mensagens pt-BR de agendamento criado/confirmado |

Tabelas e enums do módulo são prefixados com `barbershop_` (ver `prisma/schema/barbershop`).

### Como core e módulos se comunicam

A dependência é **unidirecional**: módulos dependem do core; o core nunca importa um módulo.

1. **Eventos de domínio** (`@nestjs/event-emitter`) — o core publica
   `core.tenant.created`, `core.sale.completed`, `core.payment.approved`, `core.subscription.expiring`.
   Módulos assinam o que precisam (ex.: a barbearia cria o horário padrão quando um tenant `BARBERSHOP`
   é criado e gera comissões quando uma venda é concluída).
2. **Registries** — o módulo se registra no core durante a inicialização:
   - `DashboardRegistry.register(provider)` — métricas extras no `GET /dashboard`.
   - `SystemRolesService.contribute(permissões)` — permissões do módulo anexadas às roles do sistema.
3. **Serviços do core** — módulos usam `CustomersService`, `ServicesService`, `SubscriptionsService`, etc.
4. **Referência genérica** — `Payment.referenceType/referenceId` permite que um módulo associe uma
   cobrança a uma entidade própria (ex.: `barbershop.appointment`) sem o core conhecer a tabela.

**Sem `if (businessType === ...)` espalhado.** O acesso de um tenant a um módulo é decidido em um único
lugar: o decorator `@BusinessModule(BusinessType.BARBERSHOP)` nos controllers do módulo, validado pelo
`BusinessModuleGuard` global. Um tenant `RETAIL` recebe `403` em `/barbershop/*`. Os únicos outros pontos
que olham o segmento estão **dentro do próprio módulo** (o provider de dashboard declara `supports()` e o
listener de criação de tenant ignora outros segmentos).

> Restrição do Prisma: relações precisam existir nos dois lados, por isso os models do core possuem
> campos de relação inversa (ex.: `Tenant.barbers`). Isso não gera acoplamento de código — nenhum
> service/repository do core usa esses campos.

### Multi-tenancy

Estratégia: **banco compartilhado + schema compartilhado + coluna `tenant_id`** em todas as tabelas de negócio.

Fluxo de resolução do tenant (centralizado, sem duplicação por controller):

```
JWT → JwtStrategy (User ativo + Tenant ACTIVE) → TenantContextGuard → TenantContext (AsyncLocalStorage)
    → Service → TenantScopedRepository (this.tenantId) → Prisma → PostgreSQL
```

- O `tenantId` **nunca é recebido do cliente**: vem do usuário autenticado. Enviar `tenantId` no body gera
  `400` (`forbidNonWhitelisted`).
- Todo repositório de dados de negócio estende `TenantScopedRepository` e filtra por `this.tenantId`.
  Escritas usam `where: { id, tenantId }`; um registro de outro tenant resulta em **404** (não revela existência).
- Se algum código tentar acessar dados sem contexto de tenant, `TenantContext` lança erro imediatamente.
- Listeners de eventos e jobs executam com `tenantContext.runForTenant(tenantId, fn)`.
- Isolamento coberto por testes de integração e e2e (`test/integration`, `test/e2e/tenant-isolation.e2e-spec.ts`).

### Autenticação e autorização

- **Access token** JWT (curto, `JWT_EXPIRES_IN`) assinado com `JWT_SECRET`.
- **Refresh token** JWT (`JWT_REFRESH_EXPIRES_IN`) assinado com `JWT_REFRESH_SECRET`; apenas o hash
  SHA-256 é persistido. Cada refresh **rotaciona** o token; reutilizar um token já rotacionado revoga
  todas as sessões do usuário (detecção de roubo).
- Guards globais, nesta ordem: `JwtAuthGuard` → `TenantContextGuard` → `BusinessModuleGuard` → `PermissionsGuard`.
- Rotas públicas usam `@Public()`; autorização por permissão com `@RequirePermissions('customers:manage')`.
- Permissões suportam curinga global (`*`) e por recurso (`customers:*`, `barbershop.appointments:*`).
- Roles do sistema são sincronizadas com o código **a cada boot** (`SystemRolesService`), incluindo as
  permissões contribuídas pelos módulos. O `OWNER` tem `*`.

### Decisão: Subscriptions

**A abstração de assinatura fica no core; as regras de barbearia ficam no módulo.**

- Assinatura recorrente (plano, preço, ciclo, renovação, cancelamento, expiração, lembrete de vencimento)
  é um conceito útil para qualquer segmento — salão, academia, prestador de serviço. Por isso
  `SubscriptionPlan`/`Subscription` e o `SubscriptionsService` estão em `core/subscriptions` e já se
  integram a clientes, pagamentos (`Payment.subscriptionId`), notificações e dashboard.
- O que é específico da barbearia — "o plano inclui 4 cortes por mês" e o consumo desses benefícios pelos
  atendimentos concluídos — está em `business-modules/barbershop/plan-benefits` (tabela
  `barbershop_plan_benefits`), referenciando o plano do core.
- Outro segmento poderá definir seus próprios benefícios sem tocar no core nem na barbearia.

---

## Tecnologias

NestJS 11 · TypeScript · Prisma 6 · PostgreSQL 16 · Passport + JWT (access/refresh) · class-validator /
class-transformer · @nestjs/config · @nestjs/swagger · @nestjs/event-emitter · bcrypt · Jest + Supertest ·
ESLint + Prettier · Docker / Docker Compose.

---

## Estrutura de pastas

```
src/
├── core/                      # Plataforma (independente de segmento)
│   ├── auth/                  # login, register, refresh, JWT strategy
│   ├── tenants/
│   ├── users/                 # usuários + roles do sistema
│   ├── customers/
│   ├── services/              # catálogo de serviços
│   ├── products/              # catálogo de produtos
│   ├── sales/
│   ├── payments/providers/    # PaymentProvider + registry
│   ├── subscriptions/
│   ├── notifications/providers/
│   ├── dashboard/             # DashboardRegistry + métricas do core
│   ├── audit/
│   ├── events/                # eventos de domínio do core
│   └── core.module.ts
├── business-modules/
│   ├── barbershop/
│   │   ├── settings/          # horário de funcionamento
│   │   ├── barbers/
│   │   ├── appointments/
│   │   ├── plan-benefits/     # regras de assinatura da barbearia
│   │   ├── commissions/
│   │   ├── dashboard/         # provider de métricas
│   │   ├── notifications/     # listeners de mensagens
│   │   ├── common/            # utilitários de agenda/fuso horário
│   │   ├── barbershop.permissions.ts
│   │   └── barbershop.module.ts
│   └── business-modules.module.ts
├── common/                    # infraestrutura compartilhada
│   ├── auth/                  # permissões + hasPermission
│   ├── decorators/            # @Public, @RequirePermissions, @BusinessModule, @CurrentUser
│   ├── guards/
│   ├── filters/               # filtro global de exceções
│   ├── tenancy/               # TenantContext, middleware, TenantScopedRepository
│   ├── dto/                   # paginação, transforms
│   ├── security/ types/ utils/
├── config/                    # configuração + validação de env
├── prisma/                    # PrismaService
├── health/
├── app.module.ts
├── app.setup.ts               # pipeline HTTP compartilhado (main + testes e2e)
└── main.ts
prisma/
├── schema/
│   ├── schema.prisma          # generator + datasource
│   ├── core/*.prisma
│   ├── barbershop/*.prisma
│   └── migrations/
└── seed.ts
test/
├── e2e/                       # *.e2e-spec.ts
├── integration/               # *.int-spec.ts
└── utils/
```

Testes unitários ficam ao lado do código (`*.spec.ts`).

---

## Como executar

### Pré-requisitos

- Node.js 22+
- PostgreSQL 16+ (local ou via Docker)

### Localmente

```bash
npm install                 # também executa prisma generate
cp .env.example .env        # ajuste DATABASE_URL e os segredos JWT
npm run prisma:migrate:deploy
npm run prisma:seed         # dados de demonstração (apenas desenvolvimento)
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`
- Health: `http://localhost:3000/api/v1/health`

Build de produção: `npm run build && npm run start:prod`.

---

## Configuração do .env

| Variável | Obrigatória | Padrão | Descrição |
| -------- | ----------- | ------ | --------- |
| `NODE_ENV` | não | `development` | `development`, `production` ou `test` |
| `PORT` | não | `3000` | Porta HTTP |
| `API_PREFIX` | não | `api/v1` | Prefixo global das rotas |
| `DATABASE_URL` | **sim** | — | Conexão PostgreSQL |
| `JWT_SECRET` | **sim** | — | Segredo do access token |
| `JWT_REFRESH_SECRET` | **sim** | — | Segredo do refresh token (diferente do anterior) |
| `JWT_EXPIRES_IN` | **sim** | `15m` | Validade do access token (`30s`, `15m`, `12h`, `7d`) |
| `JWT_REFRESH_EXPIRES_IN` | **sim** | `7d` | Validade do refresh token |
| `SWAGGER_ENABLED` | não | `true` | Habilita `/docs` |
| `SWAGGER_PATH` | não | `docs` | Caminho do Swagger |
| `PAYMENT_DEFAULT_PROVIDER` | não | `MANUAL` | `MANUAL`, `ASAAS`, `MERCADO_PAGO`, `STRIPE` |
| `NOTIFICATION_DEV_LOG` | não | `true` | Loga notificações enquanto não há provider integrado |
| `POSTGRES_USER/PASSWORD/DB/PORT` | só Docker | — | Usadas pelo `docker-compose.yml` |

As variáveis são validadas no boot (`src/config/env.validation.ts`); a aplicação não inicia se faltar alguma
obrigatória. **Nunca** coloque segredos no código. Gere valores fortes, por exemplo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## Docker

`docker-compose.yml` sobe **PostgreSQL** (volume persistente `postgres_data`) e a **API** (imagem de produção).
Ao iniciar, a API executa `prisma migrate deploy` automaticamente.

```bash
cp .env.example .env                              # defina JWT_SECRET e JWT_REFRESH_SECRET
docker compose up -d --build
docker compose --profile seed run --rm seed       # opcional: dados de demonstração
docker compose logs -f api
docker compose down                               # mantém os dados
docker compose down -v                            # remove também o volume do banco
```

Se a porta 5432 ou 3000 já estiver em uso, ajuste `POSTGRES_PORT` / `PORT` no `.env`.

O `Dockerfile` é multi-stage: `builder` (compila) e `production` (somente dependências de runtime, usuário
não-root, healthcheck em `/api/v1/health`).

---

## Prisma e migrations

O schema é dividido em múltiplos arquivos (`prisma/schema/core/*.prisma` e
`prisma/schema/barbershop/*.prisma`), configurado em `package.json → prisma.schema`.

| Comando | Uso |
| ------- | --- |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:validate` | Valida o schema |
| `npm run prisma:migrate` | Cria/aplica migration em desenvolvimento (`migrate dev`) |
| `npm run prisma:migrate:deploy` | Aplica migrations pendentes (CI/produção) |
| `npm run prisma:studio` | Interface visual do banco |

Migrations ficam em `prisma/schema/migrations`. Para alterar o banco: edite o `.prisma` e rode
`npx prisma migrate dev --name descricao_da_mudanca`.

---

## Seed

```bash
npm run prisma:seed
```

Idempotente (pode ser executado várias vezes). Cria:

- Roles do sistema com as permissões do core + barbearia
- Tenant **Barbearia Demo** (`BARBERSHOP`, slug `barbearia-demo`)
- Usuário **OWNER** `admin@demo.com`
- Horário de funcionamento padrão, serviços (Corte, Barba, Corte + Barba), produtos, um barbeiro,
  o plano "Plano Mensal" (4 cortes/ciclo) e uma regra de comissão global de 40%

---

## Credenciais de desenvolvimento

| E-mail | Senha | Role | Tenant |
| ------ | ----- | ---- | ------ |
| `admin@demo.com` | `Admin123!` | OWNER | Barbearia Demo |

> ⚠️ **Estas credenciais existem apenas para desenvolvimento local.** Nunca execute o seed em produção
> e nunca reutilize estas credenciais em ambientes acessíveis publicamente.

---

## Swagger

Disponível em **`/docs`** (JSON em `/docs-json`). Todos os controllers, DTOs de entrada/saída e respostas
estão documentados. Para testar rotas autenticadas: faça `POST /api/v1/auth/login`, copie o
`accessToken` e clique em **Authorize** (Bearer).

---

## Endpoints

Prefixo: `/api/v1`. Respostas de erro seguem sempre o formato:

```json
{ "statusCode": 404, "message": "Customer not found", "error": "Not Found", "timestamp": "...", "path": "/api/v1/customers/..." }
```

Listagens são paginadas com `?page=1&limit=20` e retornam `{ data, meta: { page, limit, total, totalPages } }`.

### Core

| Método | Rota | Permissão |
| ------ | ---- | --------- |
| GET | `/health` | pública |
| POST | `/auth/register` · `/auth/login` · `/auth/refresh` | pública |
| POST | `/auth/logout` · GET `/auth/me` | autenticado |
| GET / PATCH | `/tenants/current` · PATCH `/tenants/current/settings` | `tenant:read` / `tenant:manage` |
| GET | `/users/roles` · `/users` · `/users/:id` | `users:read` |
| POST / PATCH | `/users` · `/users/:id` · `/users/:id/activate` · `/users/:id/deactivate` | `users:manage` |
| GET | `/customers` · `/customers/:id` · `/customers/:id/history` | `customers:read` |
| POST / PATCH | `/customers` · `/customers/:id` · `/:id/activate` · `/:id/deactivate` | `customers:manage` |
| GET / POST / PATCH | `/services` · `/services/:id` | `catalog:read` / `catalog:manage` |
| GET / POST / PATCH | `/products` · `/products/:id` | `catalog:read` / `catalog:manage` |
| GET / POST | `/sales` · `/sales/:id` · PATCH `/sales/:id/cancel` | `sales:read` / `sales:manage` |
| GET | `/payments/gateways` · `/payments` · `/payments/:id` | `payments:read` |
| POST / PATCH | `/payments` · `/payments/:id/confirm` · POST `/payments/:id/sync` · PATCH `/payments/:id/cancel` | `payments:manage` |
| GET / POST / PATCH | `/subscription-plans` · `/subscription-plans/:id` | `subscriptions:read` / `subscriptions:manage` |
| GET | `/subscriptions` · `/subscriptions/:id` · `/subscriptions/expiring?days=7` | `subscriptions:read` |
| POST / PATCH | `/subscriptions` · `/subscriptions/:id/renew` · `/subscriptions/:id/cancel` | `subscriptions:manage` |
| POST | `/subscriptions/lifecycle/run?days=7` (expira vencidas + dispara lembretes) | `subscriptions:manage` |
| GET | `/notifications/channels` | `tenant:read` |
| GET | `/dashboard?from=&to=` | `dashboard:read` |
| GET | `/audit-logs` | `audit:read` |

### Barbershop (somente tenants `BARBERSHOP`)

| Método | Rota | Permissão |
| ------ | ---- | --------- |
| GET / PUT | `/barbershop/settings` | `tenant:read` / `barbershop.settings:manage` |
| GET | `/barbershop/barbers` · `/barbershop/barbers/:id` | `barbershop.barbers:read` |
| POST / PATCH | `/barbershop/barbers` · `/:id` · `/:id/activate` · `/:id/deactivate` | `barbershop.barbers:manage` |
| GET | `/barbershop/appointments` · `/barbershop/appointments/:id` · `/barbershop/customers/:customerId/appointments` | `barbershop.appointments:read` |
| POST | `/barbershop/appointments` | `barbershop.appointments:manage` |
| PATCH | `/barbershop/appointments/:id/reschedule` · `/confirm` · `/complete` · `/cancel` · `/no-show` | `barbershop.appointments:manage` |
| GET / PUT | `/barbershop/plans/:planId/benefits` | `subscriptions:read` / `subscriptions:manage` |
| GET | `/barbershop/subscriptions/:subscriptionId/usage` | `subscriptions:read` |
| GET / POST / PATCH | `/barbershop/commission-rules` · `/barbershop/commission-rules/:id` | `barbershop.commissions:read` / `:manage` |
| GET | `/barbershop/commissions?barberId=&status=&from=&to=` | `barbershop.commissions:read` |
| PATCH | `/barbershop/commissions/:id/pay` · `/barbershop/commissions/:id/cancel` | `barbershop.commissions:manage` |

**Comissões.** Ao concluir um atendimento (ou uma venda feita por um usuário vinculado a um barbeiro), a regra
mais específica é aplicada: *barbeiro + item* > *item* > *barbeiro (genérica)* > *global*.
Percentual = base × valor / 100; fixo = valor × quantidade. A geração é idempotente.

---

## Testes

| Comando | Escopo | Requer banco |
| ------- | ------ | ------------ |
| `npm test` | Unitários (`src/**/*.spec.ts`) | não |
| `npm run test:integration` | Repositórios + banco real (`test/integration`) | sim |
| `npm run test:e2e` | API completa via HTTP (`test/e2e`) — auth, isolamento, barbearia, vendas/pagamentos | sim (migrado + seed) |
| `npm run test:cov` | Cobertura dos unitários | não |

Testes de integração e e2e usam o `DATABASE_URL` do ambiente. **Use um banco dedicado a testes** (nunca
produção), por exemplo:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/business_platform_test npx prisma migrate deploy
DATABASE_URL=... npm run prisma:seed
DATABASE_URL=... npm run test:e2e
```

---

## Lint e formatação

```bash
npm run lint           # ESLint com --fix
npm run lint:check     # ESLint sem alterar arquivos (CI)
npm run format         # Prettier --write
npm run format:check   # Prettier --check (CI)
```

---

## Como adicionar um novo segmento

1. Adicione o valor em `enum BusinessType` (se ainda não existir) e crie `prisma/schema/<segmento>/*.prisma`
   com tabelas prefixadas (`salon_...`); gere a migration.
2. Crie `src/business-modules/<segmento>/` com seus controllers anotados com
   `@BusinessModule(BusinessType.<SEGMENTO>)`.
3. Declare as permissões em `<segmento>.permissions.ts` e contribua-as às roles no `onModuleInit` do módulo.
4. (Opcional) Registre um `DashboardMetricsProvider` e assine eventos do core.
5. Importe o módulo em `business-modules.module.ts`.

Nenhum arquivo do core precisa ser alterado.

---

## Roadmap

### Fase 1 — Foundation ✅
- Estrutura do projeto
- Core
- Multi-tenancy
- Authentication
- Users
- Customers
- Services
- Prisma
- PostgreSQL
- Docker
- Swagger

### Fase 2 — Barbershop MVP ✅
- Barbers
- Appointments
- Services
- Subscriptions
- Basic payments (provider manual)
- Basic dashboard

### Fase 3 — Barbershop Automation 🚧
- Asaas *(abstração pronta)*
- Mercado Pago *(abstração pronta)*
- WhatsApp *(abstração pronta)*
- Email *(abstração pronta)*
- Notifications *(eventos e listeners prontos)*
- Reminders *(scheduler para `subscriptions/lifecycle/run` e lembretes de agendamento)*
- Commissions ✅

### Fase 4 — Business Platform
- Sistema de módulos (habilitar/desabilitar módulos por tenant)
- Feature flags
- Configuração por segmento
- Billing da plataforma
- Planos SaaS
- Administração dos tenants (backoffice)

### Fase 5 — Novos segmentos
Preparar módulos (não implementados nesta fase):
- Retail
- Salon
- Services
