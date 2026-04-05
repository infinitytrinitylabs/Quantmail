# Quantmail - Production Tasks

## Phase 1: Critical (Week 1-2)
- [ ] Replace SQLite with PostgreSQL (update prisma schema datasource, add connection pooling)
- [ ] Replace fake liveness heuristic in `src/services/livenessService.ts` with real FaceTec/Incode SDK integration
- [ ] Add proper JWT tokens with expiry + refresh token flow in `src/utils/crypto.ts`
- [ ] Add input validation middleware (zod schemas) for all route handlers
- [ ] Add proper error handling middleware with structured error responses
- [ ] Create `.env.example` with all required environment variables
- [ ] Add rate limiting per-user (not just per-IP) using Redis

## Phase 2: Infrastructure (Week 3-4)
- [ ] Create `docker-compose.yml` with PostgreSQL + Redis + app
- [ ] Create `.github/workflows/ci.yml` - build, lint, test on PR
- [ ] Create `.github/workflows/deploy.yml` - deploy to staging/production
- [ ] Add health check endpoint with DB connectivity check
- [ ] Add structured logging (pino is already in Fastify, configure it)
- [ ] Add OpenAPI/Swagger documentation for all endpoints
- [ ] Add CORS configuration for production domains

## Phase 3: Security (Week 5-6)
- [ ] Add helmet security headers
- [ ] Add request size limits
- [ ] Add SQL injection protection (Prisma handles this but audit)
- [ ] Add brute force protection on auth endpoints
- [ ] Add API key authentication for service-to-service calls
- [ ] Audit all crypto operations - use proper key derivation (Argon2)
- [ ] Add HTTPS/TLS configuration

## Phase 4: Integration (Week 7-8)
- [ ] Build shared auth middleware package that other services can use
- [ ] Create webhook system for cross-service events
- [ ] Add message queue integration (BullMQ/Redis) for async operations
- [ ] Build admin dashboard API endpoints
- [ ] Add email sending capability (SendGrid/SES) for inbox notifications
