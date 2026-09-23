import { z } from 'zod';

export const commentBodySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Comment body is required')
    .max(2000, 'Comment must be 2000 characters or fewer'),
});
export type CommentFormValues = z.infer<typeof commentBodySchema>;