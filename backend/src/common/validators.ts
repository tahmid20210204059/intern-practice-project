const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const ALLOWED_LINK_KEYS = ['portfolio', 'github', 'linkedin', 'facebook'] as const;
export type LinkPlatform = (typeof ALLOWED_LINK_KEYS)[number];

const LINK_LABELS: Record<LinkPlatform, string> = {
  portfolio: 'Portfolio',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

const LINK_DOMAINS: Record<LinkPlatform, string> = {
  portfolio: 'http:// or https://',
  github: 'github.com',
  linkedin: 'linkedin.com',
  facebook: 'facebook.com',
};

const LINK_ALLOWED_HOSTS: Record<LinkPlatform, string[]> = {
  portfolio: [],
  github: ['github.com', 'www.github.com'],
  linkedin: ['linkedin.com', 'www.linkedin.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'fb.com'],
};

export function isValidLinkUrl(platform: LinkPlatform, value: string | undefined | null): boolean {
  if (value === undefined || value === null || value === '') return true;

  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!/^https?:\/\//i.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (platform === 'portfolio') return true;
    return LINK_ALLOWED_HOSTS[platform].includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getLinkValidationError(platform: LinkPlatform, value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === '') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const label = LINK_LABELS[platform];
  const domain = LINK_DOMAINS[platform];

  if (platform === 'portfolio') {
    if (!/^https?:\/\//i.test(trimmed)) {
      return `${label} link must start with http:// or https://`;
    }

    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return `${label} link must start with http:// or https://`;
      }
      return null;
    } catch {
      return `${label} link must start with http:// or https://`;
    }
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return `${label} link must be a valid ${domain} URL`;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return `${label} link must be a valid ${domain} URL`;
    }
    if (!LINK_ALLOWED_HOSTS[platform].includes(parsed.hostname.toLowerCase())) {
      return `${label} link must be a valid ${domain} URL`;
    }
    return null;
  } catch {
    return `${label} link must be a valid ${domain} URL`;
  }
}

export function getPasswordError(password: string): string | null {
  if (!password) return 'Password is required.';
  if (!PASSWORD_REGEX.test(password)) {
    return 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number';
  }
  return null;
}

export function isStrongPassword(password: string): boolean {
  return getPasswordError(password) === null;
}

export function getLinksError(links: any): string | null {
  if (!links || typeof links !== 'object') return 'Links must be an object';

  for (const key of ALLOWED_LINK_KEYS) {
    const value = links[key];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string') {
      const label = LINK_LABELS[key];
      return `${label} link must be a string`;
    }

    const platformError = getLinkValidationError(key, value);
    if (platformError) return platformError;
  }

  return null;
}
