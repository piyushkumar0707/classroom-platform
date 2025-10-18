import { z } from 'zod';
import { NotificationType, NotificationPriority, DeliveryChannel } from '@/models/NotificationModel';

/**
 * Notification Action Validation Schema
 */
export const notificationActionSchema = z.object({
  label: z
    .string()
    .min(1, 'Action label is required')
    .max(50, 'Action label cannot exceed 50 characters')
    .trim(),
  
  url: z
    .string()
    .url('Invalid URL format')
    .max(500, 'URL cannot exceed 500 characters'),
  
  type: z
    .enum(['primary', 'secondary'], {
      errorMap: () => ({ message: 'Action type must be either primary or secondary' })
    })
    .default('secondary')
});

/**
 * Notification Metadata Validation Schema
 */
export const notificationMetadataSchema = z.object({
  assignmentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid assignment ID')
    .optional(),
  
  classId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid class ID')
    .optional(),
  
  doubtId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid doubt ID')
    .optional(),
  
  feeId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid fee ID')
    .optional(),
  
  entityType: z
    .string()
    .max(50, 'Entity type cannot exceed 50 characters')
    .optional(),
  
  entityId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid entity ID')
    .optional(),
  
  customData: z
    .record(z.any())
    .refine(
      (data) => JSON.stringify(data).length <= 2000,
      'Custom data cannot exceed 2KB'
    )
    .optional()
});

/**
 * Create Notification Validation Schema
 */
export const createNotificationSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters long')
    .max(1000, 'Message cannot exceed 1000 characters')
    .trim(),
  
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: 'Invalid notification type' })
  }),
  
  priority: z
    .nativeEnum(NotificationPriority, {
      errorMap: () => ({ message: 'Invalid notification priority' })
    })
    .default(NotificationPriority.MEDIUM),
  
  recipient: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid recipient ID'),
  
  sender: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid sender ID')
    .optional(),
  
  deliveryChannels: z
    .array(z.nativeEnum(DeliveryChannel))
    .min(1, 'At least one delivery channel is required')
    .default([DeliveryChannel.IN_APP]),
  
  imageUrl: z
    .string()
    .url('Invalid image URL')
    .regex(/\.(jpg|jpeg|png|gif|webp)$/i, 'Image URL must end with a valid image extension')
    .optional(),
  
  actions: z
    .array(notificationActionSchema)
    .max(3, 'Cannot have more than 3 actions')
    .optional()
    .default([]),
  
  metadata: notificationMetadataSchema
    .optional(),
  
  category: z
    .string()
    .max(50, 'Category cannot exceed 50 characters')
    .trim()
    .optional(),
  
  tags: z
    .array(
      z.string()
        .max(30, 'Tag cannot exceed 30 characters')
        .trim()
    )
    .max(10, 'Cannot have more than 10 tags')
    .optional()
    .default([]),
  
  expiresAt: z
    .string()
    .datetime('Invalid expiry date format')
    .refine(
      (date) => new Date(date) > new Date(),
      'Expiry date must be in the future'
    )
    .optional(),
  
  scheduledFor: z
    .string()
    .datetime('Invalid scheduled date format')
    .optional(),
  
  campaignId: z
    .string()
    .max(100, 'Campaign ID cannot exceed 100 characters')
    .optional()
});

/**
 * Update Notification Validation Schema
 */
export const updateNotificationSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .trim()
    .optional(),
  
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters long')
    .max(1000, 'Message cannot exceed 1000 characters')
    .trim()
    .optional(),
  
  type: z
    .nativeEnum(NotificationType, {
      errorMap: () => ({ message: 'Invalid notification type' })
    })
    .optional(),
  
  priority: z
    .nativeEnum(NotificationPriority, {
      errorMap: () => ({ message: 'Invalid notification priority' })
    })
    .optional(),
  
  deliveryChannels: z
    .array(z.nativeEnum(DeliveryChannel))
    .min(1, 'At least one delivery channel is required')
    .optional(),
  
  imageUrl: z
    .string()
    .url('Invalid image URL')
    .regex(/\.(jpg|jpeg|png|gif|webp)$/i, 'Image URL must end with a valid image extension')
    .optional(),
  
  actions: z
    .array(notificationActionSchema)
    .max(3, 'Cannot have more than 3 actions')
    .optional(),
  
  metadata: notificationMetadataSchema
    .optional(),
  
  category: z
    .string()
    .max(50, 'Category cannot exceed 50 characters')
    .trim()
    .optional(),
  
  tags: z
    .array(
      z.string()
        .max(30, 'Tag cannot exceed 30 characters')
        .trim()
    )
    .max(10, 'Cannot have more than 10 tags')
    .optional(),
  
  expiresAt: z
    .string()
    .datetime('Invalid expiry date format')
    .refine(
      (date) => new Date(date) > new Date(),
      'Expiry date must be in the future'
    )
    .optional(),
  
  scheduledFor: z
    .string()
    .datetime('Invalid scheduled date format')
    .optional()
});

/**
 * Bulk Create Notifications Schema
 */
export const bulkCreateNotificationsSchema = z.object({
  notifications: z
    .array(createNotificationSchema)
    .min(1, 'At least one notification is required')
    .max(100, 'Cannot create more than 100 notifications at once'),
  
  campaignId: z
    .string()
    .max(100, 'Campaign ID cannot exceed 100 characters')
    .optional()
});

/**
 * Mark as Read Schema
 */
export const markAsReadSchema = z.object({
  notificationIds: z
    .array(
      z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification ID')
    )
    .min(1, 'At least one notification ID is required')
    .max(50, 'Cannot mark more than 50 notifications at once')
    .optional(),
  
  deviceInfo: z
    .object({
      deviceType: z
        .string()
        .max(50, 'Device type cannot exceed 50 characters')
        .optional(),
      
      platform: z
        .string()
        .max(50, 'Platform cannot exceed 50 characters')
        .optional(),
      
      ipAddress: z
        .string()
        .ip('Invalid IP address')
        .optional()
    })
    .optional()
});

/**
 * Notification Query Parameters Schema
 */
export const notificationQuerySchema = z.object({
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
    .default('20'),
  
  type: z
    .nativeEnum(NotificationType)
    .optional(),
  
  priority: z
    .nativeEnum(NotificationPriority)
    .optional(),
  
  isRead: z
    .string()
    .transform(val => val === 'true')
    .pipe(z.boolean())
    .optional(),
  
  category: z
    .string()
    .max(50, 'Category cannot exceed 50 characters')
    .trim()
    .optional(),
  
  search: z
    .string()
    .max(100, 'Search query cannot exceed 100 characters')
    .trim()
    .optional(),
  
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'priority', 'title'], {
      errorMap: () => ({ message: 'Invalid sort field' })
    })
    .optional()
    .default('createdAt'),
  
  sortOrder: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: 'Sort order must be asc or desc' })
    })
    .optional()
    .default('desc'),
  
  includeExpired: z
    .string()
    .transform(val => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false'),
  
  tags: z
    .string()
    .transform(val => val.split(',').map(tag => tag.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(30)))
    .optional(),
  
  dateFrom: z
    .string()
    .datetime('Invalid date format')
    .optional(),
  
  dateTo: z
    .string()
    .datetime('Invalid date format')
    .optional(),
  
  campaignId: z
    .string()
    .max(100, 'Campaign ID cannot exceed 100 characters')
    .optional()
});

/**
 * Notification Statistics Query Schema
 */
export const notificationStatsQuerySchema = z.object({
  period: z
    .string()
    .regex(/^\d+$/, 'Period must be a positive number')
    .transform(Number)
    .refine(val => val > 0 && val <= 365, 'Period must be between 1 and 365 days')
    .optional()
    .default('30'),
  
  groupBy: z
    .enum(['day', 'week', 'month'], {
      errorMap: () => ({ message: 'Group by must be day, week, or month' })
    })
    .optional()
    .default('day'),
  
  includeReadReceipts: z
    .string()
    .transform(val => val === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false')
});

/**
 * Delivery Status Update Schema
 */
export const deliveryStatusUpdateSchema = z.object({
  channel: z.nativeEnum(DeliveryChannel, {
    errorMap: () => ({ message: 'Invalid delivery channel' })
  }),
  
  status: z.object({
    sent: z.boolean().optional(),
    delivered: z.boolean().optional(),
    error: z
      .string()
      .max(500, 'Error message cannot exceed 500 characters')
      .optional()
  })
});

/**
 * Broadcast Notification Schema
 */
export const broadcastNotificationSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters long')
    .max(1000, 'Message cannot exceed 1000 characters')
    .trim(),
  
  type: z
    .nativeEnum(NotificationType, {
      errorMap: () => ({ message: 'Invalid notification type' })
    })
    .default(NotificationType.ANNOUNCEMENT),
  
  priority: z
    .nativeEnum(NotificationPriority, {
      errorMap: () => ({ message: 'Invalid notification priority' })
    })
    .default(NotificationPriority.MEDIUM),
  
  recipients: z.object({
    userIds: z
      .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'))
      .optional(),
    
    roles: z
      .array(z.enum(['student', 'teacher', 'admin']))
      .optional(),
    
    classIds: z
      .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid class ID'))
      .optional(),
    
    excludeUserIds: z
      .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'))
      .optional()
      .default([])
  }),
  
  deliveryChannels: z
    .array(z.nativeEnum(DeliveryChannel))
    .min(1, 'At least one delivery channel is required')
    .default([DeliveryChannel.IN_APP]),
  
  scheduledFor: z
    .string()
    .datetime('Invalid scheduled date format')
    .optional(),
  
  expiresAt: z
    .string()
    .datetime('Invalid expiry date format')
    .optional(),
  
  imageUrl: z
    .string()
    .url('Invalid image URL')
    .regex(/\.(jpg|jpeg|png|gif|webp)$/i, 'Image URL must end with a valid image extension')
    .optional(),
  
  actions: z
    .array(notificationActionSchema)
    .max(3, 'Cannot have more than 3 actions')
    .optional()
    .default([]),
  
  category: z
    .string()
    .max(50, 'Category cannot exceed 50 characters')
    .trim()
    .optional(),
  
  tags: z
    .array(
      z.string()
        .max(30, 'Tag cannot exceed 30 characters')
        .trim()
    )
    .max(10, 'Cannot have more than 10 tags')
    .optional()
    .default([])
});

/**
 * Type definitions derived from schemas
 */
export type CreateNotificationData = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationData = z.infer<typeof updateNotificationSchema>;
export type BulkCreateNotificationsData = z.infer<typeof bulkCreateNotificationsSchema>;
export type MarkAsReadData = z.infer<typeof markAsReadSchema>;
export type NotificationQueryParams = z.infer<typeof notificationQuerySchema>;
export type NotificationStatsQueryParams = z.infer<typeof notificationStatsQuerySchema>;
export type DeliveryStatusUpdateData = z.infer<typeof deliveryStatusUpdateSchema>;
export type BroadcastNotificationData = z.infer<typeof broadcastNotificationSchema>;
export type NotificationActionData = z.infer<typeof notificationActionSchema>;
export type NotificationMetadataData = z.infer<typeof notificationMetadataSchema>;