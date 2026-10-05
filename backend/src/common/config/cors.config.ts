const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://hoppscotch.io',
];

const normalize = (value: string) => value.trim().replace(/\/+$/, '');

export function getAllowedOrigins(): string[] {
  const origins = new Set<string>();
  if (process.env.NODE_ENV !== 'production') {
    DEV_ORIGINS.forEach((origin) => origins.add(origin));
  }
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && frontendUrl.trim()) origins.add(normalize(frontendUrl));
  (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map(normalize)
    .filter(Boolean)
    .forEach((origin) => origins.add(origin));
  return [...origins];
}

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}