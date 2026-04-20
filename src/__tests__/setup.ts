/**
 * Vitest setup file - configures test environment variables
 */

// Set NODE_ENV to test
process.env["NODE_ENV"] = "test";

// Set required environment variables for tests
process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/quantmail_test";
process.env["SSO_SECRET"] = "test-sso-secret-32-characters-long-minimum";
// IMPORTANT: This must match the ENCRYPTION_SECRET used in ai-router.test.ts
process.env["ENCRYPTION_SECRET"] = "quantmail-key-secret";
process.env["DEVICE_PROOF_HMAC_SECRET"] = "test-device-proof-hmac-32-chars-min";
process.env["PORT"] = "3000";
process.env["LIVENESS_PROVIDER"] = "local";
