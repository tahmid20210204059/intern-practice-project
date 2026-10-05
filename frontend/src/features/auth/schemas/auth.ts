import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number');

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').max(254, 'Email is too long').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().min(1, 'Full name is required').max(120, 'Name must be 120 characters or fewer'),
    email: z.string().min(1, 'Email is required').max(254, 'Email is too long').email('Please enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type SignupFormValues = z.infer<typeof signupSchema>;