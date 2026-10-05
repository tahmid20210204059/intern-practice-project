const PLACEHOLDER_SECRETS = ['your-strong-jwt-secret', 'changeme', 'secret', 'password'];

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  const isProd = config.NODE_ENV === 'production';
  const mongoUri = String(config.MONGO_URI ?? '').trim();
  const jwtSecret = String(config.JWT_SECRET ?? '').trim();

  if (!mongoUri) errors.push('MONGO_URI is required');
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else if (isProd && (jwtSecret.length < 32 || PLACEHOLDER_SECRETS.includes(jwtSecret))) {
    errors.push('JWT_SECRET must be at least 32 characters and not a placeholder in production');
  }
  if (isProd && !String(config.FRONTEND_URL ?? '').trim()) {
    errors.push('FRONTEND_URL is required in production');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }
  return config;
}