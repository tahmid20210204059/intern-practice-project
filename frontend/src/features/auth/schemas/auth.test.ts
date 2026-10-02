import { describe, expect, it } from 'vitest';
import { loginSchema, signupSchema } from './auth';

const issues = (schema: any, value: unknown) => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue: any) => ({ path: issue.path.join('.'), message: issue.message }));
};

const validSignup = { name: 'Ada', email: 'ada@example.com', password: 'Password1', confirmPassword: 'Password1' };

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: 'x' }).success).toBe(true);
  });

  it('requires email and password', () => {
    const result = issues(loginSchema, { email: '', password: '' });
    expect(result).toContainEqual({ path: 'email', message: 'Email is required' });
    expect(result).toContainEqual({ path: 'password', message: 'Password is required' });
  });

  it('rejects a malformed email', () => {
    expect(issues(loginSchema, { email: 'not-an-email', password: 'x' })).toContainEqual({
      path: 'email',
      message: 'Please enter a valid email address',
    });
  });
});

describe('signupSchema', () => {
  it('accepts a valid signup', () => {
    expect(signupSchema.safeParse(validSignup).success).toBe(true);
  });

  it('requires a name', () => {
    expect(issues(signupSchema, { ...validSignup, name: '' })).toContainEqual({ path: 'name', message: 'Full name is required' });
  });

  it.each([
    ['short1A', 'Password must be at least 8 characters'],
    ['PASSWORD1', 'Password must include a lowercase letter'],
    ['password1', 'Password must include an uppercase letter'],
    ['Passwordd', 'Password must include a number'],
  ])('rejects password %s', (password, message) => {
    expect(issues(signupSchema, { ...validSignup, password, confirmPassword: password })).toContainEqual({ path: 'password', message });
  });

  it('reports mismatched confirmation on the confirmPassword field', () => {
    expect(issues(signupSchema, { ...validSignup, confirmPassword: 'Different1' })).toContainEqual({
      path: 'confirmPassword',
      message: 'Passwords do not match',
    });
  });

  it('requires the confirmation field', () => {
    expect(issues(signupSchema, { ...validSignup, confirmPassword: '' })).toContainEqual({
      path: 'confirmPassword',
      message: 'Please confirm your password',
    });
  });
});
