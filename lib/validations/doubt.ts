import { z } from 'zod';

/**
 * Validation schema for creating a new doubt
 */
export const createDoubtSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(5000, 'Description cannot exceed 5000 characters')
    .trim(),
  
  subject: z
    .enum(['mathematics', 'physics', 'chemistry', 'biology', 'computer-science', 'english', 'history', 'geography', 'economics', 'other'], {
      errorMap: () => ({ message: 'Please select a valid subject' })
    }),
  
  topic: z
    .string()
    .max(100, 'Topic cannot exceed 100 characters')
    .trim()
    .optional(),
  
  priority: z
    .enum(['low', 'medium', 'high'], {
      errorMap: () => ({ message: 'Priority must be low, medium, or high' })
    })
    .optional()
    .default('medium'),
  
  tags: z
    .array(
      z.string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag cannot exceed 50 characters')
        .trim()
    )
    .max(10, 'Cannot add more than 10 tags')
    .optional()
    .default([]),
  
  attachments: z
    .array(
      z.string().url('Invalid attachment URL')
    )
    .max(5, 'Cannot add more than 5 attachments')
    .optional()
    .default([])
});

/**
 * Validation schema for updating a doubt
 */
export const updateDoubtSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .trim()
    .optional(),
  
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(5000, 'Description cannot exceed 5000 characters')
    .trim()
    .optional(),
  
  subject: z
    .enum(['mathematics', 'physics', 'chemistry', 'biology', 'computer-science', 'english', 'history', 'geography', 'economics', 'other'])
    .optional(),
  
  topic: z
    .string()
    .max(100, 'Topic cannot exceed 100 characters')
    .trim()
    .optional(),
  
  status: z
    .enum(['open', 'in_progress', 'resolved', 'closed'])
    .optional(),
  
  priority: z
    .enum(['low', 'medium', 'high'])
    .optional(),
  
  tags: z
    .array(
      z.string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag cannot exceed 50 characters')
        .trim()
    )
    .max(10, 'Cannot add more than 10 tags')
    .optional(),
  
  attachments: z
    .array(
      z.string().url('Invalid attachment URL')
    )
    .max(5, 'Cannot add more than 5 attachments')
    .optional(),
  
  assignedTo: z
    .string()
    .min(1, 'Invalid user ID')
    .optional(),
  
  rating: z
    .number()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional()
});

/**
 * Validation schema for adding a response to a doubt
 */
export const createDoubtResponseSchema = z.object({
  message: z
    .string()
    .min(1, 'Response message is required')
    .max(2000, 'Response message cannot exceed 2000 characters')
    .trim(),
  
  isResolution: z
    .boolean()
    .optional()
    .default(false),
  
  attachments: z
    .array(
      z.string().url('Invalid attachment URL')
    )
    .max(3, 'Cannot add more than 3 attachments to a response')
    .optional()
    .default([])
});

/**
 * Validation schema for doubt query parameters
 */
export const doubtQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a positive number')
    .transform(Number)
    .refine(val => val > 0, 'Page must be greater than 0')
    .optional()
    .default('1'),
  
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive number')
    .transform(Number)
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .optional()
    .default('10'),
  
  subject: z
    .enum(['mathematics', 'physics', 'chemistry', 'biology', 'computer-science', 'english', 'history', 'geography', 'economics', 'other'])
    .optional(),
  
  status: z
    .enum(['open', 'in_progress', 'resolved', 'closed'])
    .optional(),
  
  priority: z
    .enum(['low', 'medium', 'high'])
    .optional(),
  
  assignedTo: z
    .string()
    .min(1, 'Invalid user ID')
    .optional(),
  
  askedBy: z
    .string()
    .min(1, 'Invalid user ID')
    .optional(),
  
  tags: z
    .string()
    .transform(val => val.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0))
    .optional(),
  
  search: z
    .string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query cannot exceed 100 characters')
    .trim()
    .optional(),
  
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'upvotes', 'responseCount', 'priority'])
    .optional()
    .default('createdAt'),
  
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
});

/**
 * Validation schema for doubt voting
 */
export const voteDoubtSchema = z.object({
  action: z.enum(['upvote', 'downvote', 'remove'], {
    errorMap: () => ({ message: 'Action must be upvote, downvote, or remove' })
  })
});

/**
 * Validation schema for response voting
 */
export const voteResponseSchema = z.object({
  responseId: z
    .string()
    .min(1, 'Response ID is required'),
  
  action: z.enum(['upvote', 'downvote', 'remove'], {
    errorMap: () => ({ message: 'Action must be upvote, downvote, or remove' })
  })
});

/**
 * Type definitions derived from schemas
 */
export type CreateDoubtData = z.infer<typeof createDoubtSchema>;
export type UpdateDoubtData = z.infer<typeof updateDoubtSchema>;
export type CreateDoubtResponseData = z.infer<typeof createDoubtResponseSchema>;
export type DoubtQueryParams = z.infer<typeof doubtQuerySchema>;
export type VoteDoubtData = z.infer<typeof voteDoubtSchema>;
export type VoteResponseData = z.infer<typeof voteResponseSchema>;