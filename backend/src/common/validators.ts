const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const ALLOWED_LINK_KEYS = ['portfolio', 'github', 'linkedin', 'facebook'] as const;

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
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      return `${label} link must be a string`;
    }
    if (!/^https?:\/\/.+/i.test(value.trim())) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      return `${label} link must start with http:// or https://`;
    }
  }

  return null;
}
