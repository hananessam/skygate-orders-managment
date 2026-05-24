# SkyGate Orders Management API

NestJS + Prisma + PostgreSQL backend with JWT authentication and OpenAPI documentation.

## Implemented API Scope

- Health endpoint (`GET /`)
- Auth endpoint: `POST /api/auth/register`
- Auth endpoint: `POST /api/auth/login`
- Auth endpoint: `POST /api/auth/refresh`
- Auth endpoint: `POST /api/auth/logout`
- Auth endpoint: `GET /api/auth/me`
- Product endpoint (public read-only): `GET /api/products`
- Product endpoint (public read-only): `GET /api/products/:id`
- Order endpoint (authenticated): `POST /api/orders`
- Order endpoint (authenticated): `GET /api/orders`

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+ (only needed for non-Docker local run)
- Docker + Docker Compose (for containerized run)

## Environment

Copy and adjust environment values:

```bash
cp .env.example .env
```

Important vars:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_HOST`
- `REDIS_PORT`
- `OPENAPI_SERVER_URL`

## Run Locally (without Docker)

```bash
npm install
npx prisma migrate dev
npm run db:seed
redis-server
npm run start:dev
```

App URL:

- `http://localhost:3000`

API docs:

- `http://localhost:3000/docs`
- `http://localhost:3000/docs-json`

## Docker Setup

This repository includes:

- `Dockerfile` for the Nest app
- `docker-compose.yml` for API + PostgreSQL
- `.dockerignore` for smaller/faster builds

### Start with Docker

```bash
docker compose up --build -d
```

The API container runs:

- Prisma migrations (`prisma migrate deploy`)
- Seed script (`npm run db:seed`)
- Nest app (`npm run start:prod`)

Service URLs:

- API: `http://localhost:3000`
- Docs: `http://localhost:3000/docs`
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

### Stop and remove DB volume

```bash
docker compose down -v
```

## Useful Commands

```bash
# build app
npm run build

# run unit tests
npm run test

# run e2e tests
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
- For production, replace JWT secrets and database credentials with secure values.
