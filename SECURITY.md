# Security Best Practices for Quantmail

## 🔐 Critical Security Requirements

### Environment Variables

**NEVER use default values in production!** All the following environment variables MUST be set with strong, randomly generated values:

```bash
# Generate strong secrets (run these commands):
openssl rand -base64 32  # For SSO_SECRET
openssl rand -base64 32  # For ENCRYPTION_SECRET
openssl rand -base64 32  # For DEVICE_PROOF_HMAC_SECRET
```

#### Required Environment Variables

1. **DATABASE_URL** - PostgreSQL connection string
   - ⚠️ NEVER use default password `quantmail`
   - Use strong password with special characters

2. **SSO_SECRET** - Session token signing key
   - ⚠️ Must be ≥32 characters
   - NEVER use `quantmail-dev-secret`

3. **ENCRYPTION_SECRET** - API key encryption key
   - ⚠️ Must be ≥32 characters
   - NEVER use `quantmail-key-secret`

4. **DEVICE_PROOF_HMAC_SECRET** - IoT device verification
   - ⚠️ Must be ≥32 characters
   - Required for IoT functionality

5. **REDIS_URL** - Session store (REQUIRED for production)
   - ⚠️ In-memory sessions DO NOT work with multiple instances
   - Required for horizontal scaling

### Authentication Security

#### Implemented Protections

✅ **All inbox routes require authentication**
- `/inbox/:userId` - Users can only access their own inbox
- `/inbox/shadow/all` - Admin-only access

✅ **Zero-trust token validation**
- Access tokens expire in 15 minutes (not 1 hour)
- Biometric hash verification on every request
- Session fingerprinting with IP subnet validation

✅ **CORS protection**
- Always uses allowlist (even in development)
- No `origin: true` vulnerability

✅ **CSP headers configured**
- Prevents XSS attacks
- Restricts resource loading

#### Session Security

- **Access Token TTL**: 15 minutes (zero-trust requirement)
- **Refresh Token TTL**: 7 days
- **Max Sessions Per User**: 5
- **Fingerprint Binding**: UserAgent + IP subnet
- **Session Touch**: Activity timestamp updated on each request

### Database Security

✅ **Connection pooling configured**
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

✅ **No SQL injection**
- All queries use Prisma parameterization
- No raw SQL except health check

### Known Limitations & Recommendations

#### High Priority

1. **Redis Required for Production**
   - Current sessions stored in-memory
   - Will NOT survive server restarts
   - Will NOT work with load balancers
   - **Action**: Set `REDIS_URL` before deploying multiple instances

2. **WebAuthn Challenges In-Memory**
   - Same issue as sessions
   - **Action**: Migrate to Redis when implementing session Redis

3. **Continuous Auth State In-Memory**
   - Behavioral biometrics lost on restart
   - **Action**: Migrate to Redis for production

#### Medium Priority

4. **No Replay Protection on Liveness Check**
   - Local liveness uses hash of image
   - Same image = same hash
   - **Recommendation**: Implement challenge-response for production

5. **Ephemeral Messages Not Auto-Purged**
   - `purgeDestroyed()` exists but never called
   - **Action**: Schedule worker or cron job

6. **Biometric Hash Collision Risk**
   - Hash = HMAC(email:facialMatrixHash)
   - If liveness service returns same hash for different faces, registration fails
   - **Recommendation**: Add timestamp or nonce to hash input

### Deployment Checklist

Before deploying to production:

- [ ] Generate all secrets with `openssl rand -base64 32`
- [ ] Set DATABASE_URL with strong password
- [ ] Set REDIS_URL (required!)
- [ ] Verify SSO_SECRET ≠ "quantmail-dev-secret"
- [ ] Verify ENCRYPTION_SECRET ≠ "quantmail-key-secret"
- [ ] Set CORS_ORIGINS to actual domain
- [ ] Configure WEBAUTHN_RP_ID to actual domain
- [ ] Configure WEBAUTHN_ORIGIN to actual domain
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Enable branch protection on main
- [ ] Configure monitoring and alerting
- [ ] Test session persistence across restarts
- [ ] Test with load balancer / multiple instances

### Vulnerability Reporting

If you discover a security vulnerability, please email security@quantmail.example.com instead of creating a public issue.

## Recent Security Fixes

### 2026-04-19 - Comprehensive Security Audit

- ✅ Fixed missing authentication on inbox routes
- ✅ Removed hardcoded secrets, enforced env vars
- ✅ Fixed PrismaPg adapter (was causing runtime errors)
- ✅ Added database connection pooling
- ✅ Reduced access token TTL (1hr → 15min)
- ✅ Added environment validation on startup
- ✅ Fixed CSRF vulnerability in development
- ✅ Added CSP headers
- ✅ Improved session fingerprint validation
- ✅ Added touchSession calls (was dead code)
- ✅ Updated Fastify to 5.8.5 (security fix)
