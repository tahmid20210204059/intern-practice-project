import { describe, expect, it } from 'vitest';
import { educationItemSchema, experienceItemSchema, portfolioFormSchema, portfolioProjectSchema } from './profile';

const issues = (schema: any, value: unknown) => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue: any) => ({ path: issue.path.join('.'), message: issue.message }));
};

const project = (overrides: Record<string, unknown> = {}) => ({
  title: 'Dev Community',
  description: '',
  urls: { live: '', github: '' },
  technologies: [],
  from: '2020-01',
  isCurrent: false,
  to: '2021-01',
  ...overrides,
});

describe('experienceItemSchema', () => {
  it('accepts the minimum fields and defaults optional ones', () => {
    const result = experienceItemSchema.safeParse({ title: 'Dev', company: 'Acme', from: '2020-01' });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ to: '', description: '' });
  });

  it('requires title and company', () => {
    const result = issues(experienceItemSchema, { title: '', company: '', from: '2020-01' });
    expect(result).toContainEqual({ path: 'title', message: 'Title is required' });
    expect(result).toContainEqual({ path: 'company', message: 'Company is required' });
  });

  it('rejects a future start date', () => {
    expect(issues(experienceItemSchema, { title: 'D', company: 'A', from: '2999-01' })).toContainEqual({
      path: 'from',
      message: 'Start date cannot be in the future',
    });
  });

  it('rejects a malformed month', () => {
    expect(issues(experienceItemSchema, { title: 'D', company: 'A', from: '2020-13' })).toContainEqual({
      path: 'from',
      message: 'Start date must be in YYYY-MM format',
    });
  });

  it('rejects an end date before the start date', () => {
    expect(issues(experienceItemSchema, { title: 'D', company: 'A', from: '2022-05', to: '2022-04' })).toContainEqual({
      path: 'to',
      message: 'End date cannot be before the start date',
    });
  });

  it('allows an empty end date and an end date equal to the start', () => {
    expect(experienceItemSchema.safeParse({ title: 'D', company: 'A', from: '2022-05', to: '' }).success).toBe(true);
    expect(experienceItemSchema.safeParse({ title: 'D', company: 'A', from: '2022-05', to: '2022-05' }).success).toBe(true);
  });

  it('limits the description to 500 characters', () => {
    expect(issues(experienceItemSchema, { title: 'D', company: 'A', from: '2020-01', description: 'x'.repeat(501) })).toContainEqual({
      path: 'description',
      message: 'Description must be 500 characters or fewer',
    });
  });
});

describe('educationItemSchema', () => {
  it('accepts valid education and defaults subject', () => {
    const result = educationItemSchema.safeParse({ degree: 'BSc', institute: 'AUST', from: '2016-01', to: '2020-01' });
    expect(result.success).toBe(true);
    expect(result.data?.subject).toBe('');
  });

  it('requires degree and institute and validates dates', () => {
    const result = issues(educationItemSchema, { degree: '', institute: '', from: '2020-05', to: '2020-01' });
    expect(result).toContainEqual({ path: 'degree', message: 'Degree is required' });
    expect(result).toContainEqual({ path: 'institute', message: 'Institute is required' });
    expect(result).toContainEqual({ path: 'to', message: 'End date cannot be before the start date' });
  });
});

describe('portfolioProjectSchema', () => {
  it('accepts a completed project', () => {
    expect(portfolioProjectSchema.safeParse(project()).success).toBe(true);
  });

  it('accepts an ongoing project without an end date', () => {
    expect(portfolioProjectSchema.safeParse(project({ isCurrent: true, to: '' })).success).toBe(true);
  });

  it('requires an end date unless the project is ongoing', () => {
    expect(issues(portfolioProjectSchema, project({ to: '' }))).toContainEqual({
      path: 'to',
      message: 'End date is required unless the project is ongoing',
    });
  });

  it('rejects an end date before the start date', () => {
    expect(issues(portfolioProjectSchema, project({ from: '2022-05', to: '2022-01' }))).toContainEqual({
      path: 'to',
      message: 'End date cannot be before the start date',
    });
  });

  it('requires a title', () => {
    expect(issues(portfolioProjectSchema, project({ title: '  ' }))).toContainEqual({ path: 'title', message: 'Project title is required' });
  });

  it('validates project urls', () => {
    const result = issues(portfolioProjectSchema, project({ urls: { live: 'ftp://x.io', github: 'https://gitlab.com/a/b' } }));
    expect(result).toContainEqual({ path: 'urls.live', message: 'Live URL must start with http:// or https://' });
    expect(result).toContainEqual({ path: 'urls.github', message: 'GitHub URL must be a valid github.com link' });
    expect(portfolioProjectSchema.safeParse(project({ urls: { live: 'https://x.io', github: 'https://github.com/a/b' } })).success).toBe(true);
  });

  it('validates tools', () => {
    expect(issues(portfolioProjectSchema, project({ technologies: [{ value: '  ' }] }))).toContainEqual({
      path: 'technologies.0.value',
      message: 'Tool cannot be empty',
    });
    const tooMany = Array.from({ length: 21 }, (_, i) => ({ value: `t${i}` }));
    expect(issues(portfolioProjectSchema, project({ technologies: tooMany }))).toContainEqual({
      path: 'technologies',
      message: 'A project can list at most 20 tools',
    });
  });
});

describe('portfolioFormSchema', () => {
  it('limits the form to 30 projects', () => {
    const projects = Array.from({ length: 31 }, () => project());
    expect(issues(portfolioFormSchema, { portfolioProjects: projects })).toContainEqual({
      path: 'portfolioProjects',
      message: 'You can list at most 30 portfolio projects',
    });
    expect(portfolioFormSchema.safeParse({ portfolioProjects: projects.slice(0, 30) }).success).toBe(true);
  });
});
