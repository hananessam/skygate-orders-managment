# SkyGate Orders Management API

NestJS + Prisma + PostgreSQL backend with JWT authentication, Redis-backed idempotency, and Swagger/OpenAPI documentation.

## Implemented API Scope

- Health endpoint (`GET /api/`)
- Auth endpoint: `POST /api/auth/register`
- Auth endpoint: `POST /api/auth/login`
- Auth endpoint: `POST /api/auth/refresh`
- Auth endpoint: `POST /api/auth/logout`
- Auth endpoint: `GET /api/auth/me`
- Product endpoint (public read): `GET /api/products`
- Product endpoint (public read): `GET /api/products/:id`
- Product endpoint (authenticated write): `PUT /api/products/:id`
- Product endpoint (authenticated write): `DELETE /api/products/:id` (soft delete)
- Order endpoint (authenticated): `POST /api/orders` (supports `Idempotency-Key`)
- Order endpoint (authenticated): `GET /api/orders`

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+ (only needed for non-Docker local run)
- Redis (only needed for non-Docker local run)
- Docker + Docker Compose (recommended)

## Environment

Copy and adjust environment values:

```bash
cp .env.example .env
```

Important variables:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_HOST`
- `REDIS_PORT`
- `OPENAPI_SERVER_URL`

## Run Locally (without Docker)

```bash
npm install
npm run db:migrate
npm run db:seed
redis-server
npm run start:dev
```

App URL:

- `http://localhost:3000/api`

API docs:

- `http://localhost:3000/docs`
- `http://localhost:3000/docs-json`

## Docker Setup (Preferred)

This repository includes:

- `Dockerfile` for the Nest app
- `docker-compose.yml` for API + PostgreSQL + Redis
- `.dockerignore` for smaller/faster builds

### Start with Docker Compose

```bash
docker compose up --build -d
```

On startup, the API container runs:

- Prisma migrations (`prisma migrate deploy`)
- Seed script (`npm run db:seed`)
- Nest app (`npm run start:prod`)

Service URLs:

- API: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- Postgres: `localhost:5433`
- Redis: `localhost:6379`

### View logs

```bash
docker compose logs -f api
docker compose logs -f db
```

### Stop containers

```bash
docker compose down
```

### Stop and remove volumes

```bash
docker compose down -v
```

## How Race Conditions Are Handled

Order creation is protected with layered safeguards to prevent duplicate orders and stock inconsistencies.

1. Transaction boundary:
All stock checks, stock updates, and order creation run inside one database transaction. If any step fails, the full operation rolls back.

2. Row-level locking:
Product rows are locked with `SELECT ... FOR UPDATE` before stock validation and decrement.

3. Conflict signaling:
When stock becomes insufficient during a concurrent flow, the API returns a conflict response so clients can retry safely.

4. Idempotent order creation:
`POST /api/orders` accepts an optional `Idempotency-Key` UUID.
- Redis stores keys per user for 24 hours.
- In-flight duplicate requests with the same key return conflict.
- Completed duplicate retries return the original successful response instead of creating a second order.

## API Endpoint Documentation

Swagger and OpenAPI:

- Interactive docs: `http://localhost:3000/docs`
- Raw OpenAPI JSON: `http://localhost:3000/docs-json`
- Generate OpenAPI file:

```bash
npm run openapi:generate
```

Generated artifact:

- `openapi.json`

## Useful Commands

```bash
# build app
npm run build

# run unit tests
npm run test

# run e2e/integration tests
npm run test:e2e

# generate OpenAPI file
npm run openapi:generate

# Prisma
npm run db:migrate
npm run db:seed
```

## Notes

- Default seed creates or updates `admin@example.com`.
- Default seed also creates or updates sample products by SKU.
