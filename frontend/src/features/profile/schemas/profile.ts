import { z } from 'zod';
import { isValidLinkUrl } from '../utils/validators';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const OPTIONAL_URL_REGEX = /^$|^https?:\/\/.+/i;

const isPastOrCurrentMonth = (value: string) => {
  if (!value || !MONTH_REGEX.test(value)) return false;

  const [year, month] = value.split('-').map(Number);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return year < currentYear || (year === currentYear && month <= currentMonth);
};

const toolItemSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, 'Tool cannot be empty')
    .max(40, 'Each tool must be 40 characters or fewer'),
});

const projectUrlsSchema = z.object({
  live: z
    .string()
    .max(2048, 'Live URL must be 2048 characters or fewer')
    .regex(OPTIONAL_URL_REGEX, 'Live URL must start with http:// or https://'),
  github: z
    .string()
    .max(2048, 'GitHub URL must be 2048 characters or fewer')
    .refine((value) => value === '' || isValidLinkUrl('github', value), {
      message: 'GitHub URL must be a valid github.com link',
    }),
});

export const portfolioProjectSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Project title is required')
      .max(120, 'Project title must be 120 characters or fewer'),
    description: z.string().max(500, 'Project description must be 500 characters or fewer'),
    urls: projectUrlsSchema,
    technologies: z.array(toolItemSchema).max(20, 'A project can list at most 20 tools'),
    from: z
      .string()
      .min(1, 'Start date is required')
      .regex(MONTH_REGEX, 'Start date must be in YYYY-MM format')
      .refine((value) => isPastOrCurrentMonth(value), {
        message: 'Start date cannot be in the future',
      }),
    isCurrent: z.boolean(),
    to: z.string(),
  })
  .superRefine((project, ctx) => {
    if (project.isCurrent) return;

    if (!project.to) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date is required unless the project is ongoing',
        path: ['to'],
      });
      return;
    }
    if (!MONTH_REGEX.test(project.to)) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date must be in YYYY-MM format',
        path: ['to'],
      });
      return;
    }
    if (project.to < project.from) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date cannot be before the start date',
        path: ['to'],
      });
    }
  });

export const portfolioFormSchema = z.object({
  portfolioProjects: z.array(portfolioProjectSchema).max(30, 'You can list at most 30 portfolio projects'),
});

export const experienceItemSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120, 'Title must be 120 characters or fewer'),
    company: z.string().trim().min(1, 'Company is required').max(120, 'Company must be 120 characters or fewer'),
    from: z
      .string()
      .trim()
      .min(1, 'Start date is required')
      .regex(MONTH_REGEX, 'Start date must be in YYYY-MM format')
      .refine((value) => isPastOrCurrentMonth(value), {
        message: 'Start date cannot be in the future',
      }),
    to: z.string().trim().optional().default(''),
    description: z.string().max(500, 'Description must be 500 characters or fewer').default(''),
  })
  .superRefine((item, ctx) => {
    if (!item.to) return;
    if (!MONTH_REGEX.test(item.to)) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date must be in YYYY-MM format',
        path: ['to'],
      });
      return;
    }
    if (item.to < item.from) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date cannot be before the start date',
        path: ['to'],
      });
    }
  });

export const educationItemSchema = z
  .object({
    degree: z.string().trim().min(1, 'Degree is required').max(120, 'Degree must be 120 characters or fewer'),
    institute: z.string().trim().min(1, 'Institute is required').max(120, 'Institute must be 120 characters or fewer'),
    subject: z.string().trim().max(120, 'Subject must be 120 characters or fewer').default(''),
    from: z
      .string()
      .trim()
      .min(1, 'Start date is required')
      .regex(MONTH_REGEX, 'Start date must be in YYYY-MM format')
      .refine((value) => isPastOrCurrentMonth(value), {
        message: 'Start date cannot be in the future',
      }),
    to: z.string().trim().optional().default(''),
  })
  .superRefine((item, ctx) => {
    if (!item.to) return;
    if (!MONTH_REGEX.test(item.to)) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date must be in YYYY-MM format',
        path: ['to'],
      });
      return;
    }
    if (item.to < item.from) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date cannot be before the start date',
        path: ['to'],
      });
    }
  });

export type PortfolioProjectFormValues = z.infer<typeof portfolioProjectSchema>;
export type PortfolioFormValues = z.infer<typeof portfolioFormSchema>;
export type ExperienceFormValues = z.infer<typeof experienceItemSchema>;
export type EducationFormValues = z.infer<typeof educationItemSchema>;
