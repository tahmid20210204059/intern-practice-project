const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const LINK_ALLOWED_HOSTS = {
  portfolio: [],
  github: ['github.com', 'www.github.com'],
  linkedin: ['linkedin.com', 'www.linkedin.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'fb.com'],
} as const;

export function getPasswordError(password: string): string | null {
  if (!password) return 'Password is required.';
  if (!PASSWORD_REGEX.test(password)) {
    return 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.';
  }
  return null;
}

export function isValidLinkUrl(platform: 'portfolio' | 'github' | 'linkedin' | 'facebook', url: string | undefined | null): boolean {
  if (url === undefined || url === null || url === '') return true;

  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (platform === 'portfolio') return true;

    const allowedHosts: readonly string[] =
      platform === 'github' ? LINK_ALLOWED_HOSTS.github : platform === 'linkedin' ? LINK_ALLOWED_HOSTS.linkedin : LINK_ALLOWED_HOSTS.facebook;

    return allowedHosts.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
