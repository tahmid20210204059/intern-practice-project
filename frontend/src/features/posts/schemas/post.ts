import { z } from 'zod';

export const postSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150, 'Title must be 150 characters or fewer'),
  body: z.string().trim().min(1, 'Body is required').max(5000, 'Body must be 5000 characters or fewer'),
  imageUrl: z.string().default(''),
});
export type PostFormValues = z.input<typeof postSchema>;
