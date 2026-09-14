const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

export function getPasswordError(password: string): string | null {
  if (!password) return 'Password is required.';
  if (!PASSWORD_REGEX.test(password)) {
    return 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.';
  }
  return null;
}

export function isValidLinkUrl(url: string): boolean {
  if (!url) return true;
  return /^https?:\/\/.+/i.test(url.trim());
}