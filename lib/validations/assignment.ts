import { z } from 'zod';

/**
 * Validation schema for creating a new assignment
 */
export const createAssignmentSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(5000, 'Description cannot exceed 5000 characters')
    .trim(),
  
  instructions: z
    .string()
    .max(3000, 'Instructions cannot exceed 3000 characters')
    .trim()
    .optional(),
  
  subject: z
    .enum(['mathematics', 'physics', 'chemistry', 'biology', 'computer-science', 'english', 'history', 'geography', 'economics', 'other'], {
      errorMap: () => ({ message: 'Please select a valid subject' })
    }),
  
  dueDate: z
    .string()
    .datetime('Invalid date format')
    .refine((date) => new Date(date) > new Date(), {
      message: 'Due date must be in the future'
    }),
  
  maxMarks: z
    .number()
    .min(1, 'Maximum marks must be at least 1')
    .max(1000, 'Maximum marks cannot exceed 1000'),
  
  attachments: z
    .array(
      z.string().url('Invalid attachment URL')
    )
    .max(10, 'Cannot add more than 10 attachments')
    .optional()
    .default([]),
  
  class: z
    .string()
    .min(1, 'Class ID is required')
    .optional(),
  
  assignmentType: z
    .enum(['homework', 'quiz', 'project', 'test', 'lab'], {
      errorMap: () => ({ message: 'Invalid assignment type' })
    })
    .optional()
    .default('homework'),
  
  isPublished: z
    .boolean()
    .optional()
    .default(true),
  
  submissionsAllowed: z
    .boolean()
    .optional()
    .default(true),
  
  lateSubmissionAllowed: z
    .boolean()
    .optional()
    .default(false),
  
  lateSubmissionPenalty: z
    .number()
    .min(0, 'Penalty cannot be negative')
    .max(100, 'Penalty cannot exceed 100%')
    .optional()
    .default(0),
  
  tags: z
    .array(
      z.string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag cannot exceed 50 characters')
        .trim()
    )
    .max(10, 'Cannot add more than 10 tags')
    .optional()
    .default([])
});

/**
 * Validation schema for updating an assignment
 */
export const updateAssignmentSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .trim()
    .optional(),
  
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(5000, 'Description cannot exceed 5000 characters')
    .trim()
    .optional(),
  
  instructions: z
    .string()
    .max(3000, 'Instructions cannot exceed 3000 characters')
    .trim()
    .optional(),
  
  subject: z
    .enum(['mathematics', 'physics', 'chemistry', 'biology', 'computer-science', 'english', 'history', 'geography', 'economics', 'other'])
    .optional(),
  
  dueDate: z
    .string()
    .datetime('Invalid date format')
    .refine((date) => new Date(date) > new Date(), {
      message: 'Due date must be in the future'
    })
    .optional(),
  
  maxMarks: z
    .number()
    .min(1, 'Maximum marks must be at least 1')
    .max(1000, 'Maximum marks cannot exceed 1000')
    .optional(),
  
  attachments: z
    .array(
      z.string().url('Invalid attachment URL')
    )
    .max(10, 'Cannot add more than 10 attachments')
    .optional(),
  
  class: z
    .string()
    .min(1, 'Invalid class ID')
    .optional(),
  
  assignmentType: z
    .enum(['homework', 'quiz', 'project', 'test', 'lab'])
    .optional(),
  
  isPublished: z
    .boolean()
    .optional(),
  
  submissionsAllowed: z
    .boolean()
    .optional(),
  
  lateSubmissionAllowed: z
    .boolean()
    .optional(),
  
  lateSubmissionPenalty: z
    .number()
    .min(0, 'Penalty cannot be negative')
    .max(100, 'Penalty cannot exceed 100%')
    .optional(),
  
  tags: z
    .array(
      z.string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag cannot exceed 50 characters')
        .trim()
    )
    .max(10, 'Cannot add more than 10 tags')
    .optional()
});

/**
 * Validation schema for creating assignment submission
 */
export const createSubmissionSchema = z.object({
  content: z
    .string()
    .min(1, 'Submission content is required')
    .max(10000, 'Submission content cannot exceed 10000 characters')
    .trim(),
  
  attachments: z
    .array(
      z.string().url('Invalid attachment URL')
    )
    .max(5, 'Cannot add more than 5 attachments to a submission')
    .optional()
    .default([])
});

/**
 * Validation schema for grading assignment submission
 */
export const gradeSubmissionSchema = z.object({
  marks: z
    .number()
    .min(0, 'Marks cannot be negative'),
  
  feedback: z
    .string()
    .max(2000, 'Feedback cannot exceed 2000 characters')
    .trim()
    .optional()
});

/**
 * Validation schema for assignment query parameters
 */
export const assignmentQuerySchema = z.object({
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
    .refine(val => val > 0 && val <= 50, 'Limit must be between 1 and 50')
    .optional()
    .default('10'),
  
  subject: z
    .enum(['mathematics', 'physics', 'chemistry', 'biology', 'computer-science', 'english', 'history', 'geography', 'economics', 'other'])
    .optional(),
  
  assignmentType: z
    .enum(['homework', 'quiz', 'project', 'test', 'lab'])
    .optional(),
  
  status: z
    .enum(['draft', 'active', 'overdue', 'completed'])
    .optional(),
  
  isPublished: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  
  createdBy: z
    .string()
    .min(1, 'Invalid user ID')
    .optional(),
  
  class: z
    .string()
    .min(1, 'Invalid class ID')
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
    .enum(['createdAt', 'updatedAt', 'dueDate', 'title', 'maxMarks', 'submissionCount'])
    .optional()
    .default('createdAt'),
  
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
  
  dueDateFrom: z
    .string()
    .datetime('Invalid date format')
    .optional(),
  
  dueDateTo: z
    .string()
    .datetime('Invalid date format')
    .optional()
});

/**
 * Validation schema for submission query parameters
 */
export const submissionQuerySchema = z.object({
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
    .refine(val => val > 0 && val <= 50, 'Limit must be between 1 and 50')
    .optional()
    .default('10'),
  
  student: z
    .string()
    .min(1, 'Invalid student ID')
    .optional(),
  
  isGraded: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  
  isLate: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  
  sortBy: z
    .enum(['submittedAt', 'marks', 'gradedAt'])
    .optional()
    .default('submittedAt'),
  
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
});

/**
 * Type definitions derived from schemas
 */
export type CreateAssignmentData = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentData = z.infer<typeof updateAssignmentSchema>;
export type CreateSubmissionData = z.infer<typeof createSubmissionSchema>;
export type GradeSubmissionData = z.infer<typeof gradeSubmissionSchema>;
export type AssignmentQueryParams = z.infer<typeof assignmentQuerySchema>;
export type SubmissionQueryParams = z.infer<typeof submissionQuerySchema>;