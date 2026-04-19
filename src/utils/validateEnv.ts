/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup to fail fast
 * instead of encountering runtime errors later.
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Required environment variables that must be set in production.
 */
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "SSO_SECRET",
  "ENCRYPTION_SECRET",
  "DEVICE_PROOF_HMAC_SECRET",
] as const;

/**
 * Optional but recommended environment variables.
 */
const RECOMMENDED_ENV_VARS = [
  "REDIS_URL",
  "WEBAUTHN_RP_ID",
  "WEBAUTHN_RP_NAME",
  "WEBAUTHN_ORIGIN",
] as const;

/**
 * Validates that all required environment variables are set.
 * In development mode, only checks critical variables.
 * In production mode, enforces all required variables.
 */
export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env["NODE_ENV"] === "production";

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      if (isProduction) {
        missing.push(envVar);
      } else {
        warnings.push(`${envVar} not set (using default - NOT for production)`);
      }
    }
  }

  // Check recommended variables
  for (const envVar of RECOMMENDED_ENV_VARS) {
    if (!process.env[envVar]) {
      warnings.push(`${envVar} not set (recommended for production)`);
    }
  }

  // Validate secret strength in production
  if (isProduction) {
    const ssoSecret = process.env["SSO_SECRET"];
    const encryptionSecret = process.env["ENCRYPTION_SECRET"];

    if (ssoSecret && ssoSecret.length < 32) {
      warnings.push("SSO_SECRET should be at least 32 characters long");
    }

    if (encryptionSecret && encryptionSecret.length < 32) {
      warnings.push("ENCRYPTION_SECRET should be at least 32 characters long");
    }

    // Check for default/weak secrets
    const weakSecrets = ["quantmail-dev-secret", "quantmail-key-secret", "change_me"];
    if (ssoSecret && weakSecrets.includes(ssoSecret)) {
      missing.push("SSO_SECRET contains default/weak value - MUST be changed");
    }
    if (encryptionSecret && weakSecrets.includes(encryptionSecret)) {
      missing.push("ENCRYPTION_SECRET contains default/weak value - MUST be changed");
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Gets a required environment variable, throwing an error if not set.
 * Use this for critical configuration that has no safe default.
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Gets an optional environment variable with a default value.
 * Logs a warning if using the default value in production.
 */
export function getEnvOrDefault(name: string, defaultValue: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env["NODE_ENV"] === "production") {
      console.warn(`⚠️  Using default value for ${name} in production mode`);
    }
    return defaultValue;
  }
  return value;
}
