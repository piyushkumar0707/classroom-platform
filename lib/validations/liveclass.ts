import { z } from 'zod';
import { LiveClassStatus, ParticipantRole, ClassType, RecordingQuality, PlatformType } from '@/models/LiveClassModel';

// Base validation schemas
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

const timeZoneSchema = z.string().min(1).default('UTC');

const participantSchema = z.object({
  userId: objectIdSchema,
  role: z.nativeEnum(ParticipantRole).default(ParticipantRole.STUDENT),
  joinedAt: z.date().optional(),
  leftAt: z.date().optional(),
  duration: z.number().min(0).default(0),
  isPresent: z.boolean().default(false),
  connectionQuality: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  deviceInfo: z.object({
    type: z.string(),
    browser: z.string().optional(),
    os: z.string().optional(),
  }).optional(),
});

const materialSchema = z.object({
  name: z.string().min(1, 'Material name is required').max(200),
  url: z.string().url('Invalid URL format'),
  type: z.string().min(1, 'Material type is required'),
  size: z.number().min(0).optional(),
  uploadedAt: z.date().default(() => new Date()),
});

const recordingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
  duration: z.number().min(0),
  quality: z.nativeEnum(RecordingQuality).default(RecordingQuality.HD),
  size: z.number().min(0),
  createdAt: z.date().default(() => new Date()),
  isProcessed: z.boolean().default(false),
  downloadCount: z.number().min(0).default(0),
  viewCount: z.number().min(0).default(0),
  isPublic: z.boolean().default(false),
  accessAllowedTo: z.array(objectIdSchema).default([]),
});

const breakoutRoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  participants: z.array(objectIdSchema).default([]),
  createdAt: z.date().default(() => new Date()),
  endedAt: z.date().optional(),
  maxParticipants: z.number().min(1).max(50).default(10),
  topic: z.string().max(200).optional(),
});

const chatMessageSchema = z.object({
  id: z.string().min(1),
  senderId: objectIdSchema,
  message: z.string().min(1).max(1000),
  timestamp: z.date().default(() => new Date()),
  isPrivate: z.boolean().default(false),
  recipientId: objectIdSchema.optional(),
  messageType: z.enum(['text', 'file', 'poll', 'announcement']).default('text'),
  metadata: z.record(z.any()).optional(),
});

const pollResponseInternalSchema = z.object({
  participantId: objectIdSchema,
  selectedOption: z.number().min(0),
  timestamp: z.date().default(() => new Date()),
});

const pollSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  createdBy: objectIdSchema,
  createdAt: z.date().default(() => new Date()),
  endedAt: z.date().optional(),
  responses: z.array(pollResponseInternalSchema).default([]),
  isAnonymous: z.boolean().default(false),
  allowMultiple: z.boolean().default(false),
});

const whiteboardSessionSchema = z.object({
  id: z.string().min(1),
  createdBy: objectIdSchema,
  createdAt: z.date().default(() => new Date()),
  endedAt: z.date().optional(),
  collaborators: z.array(objectIdSchema).default([]),
  content: z.string(),
  version: z.number().min(1).default(1),
});

const screenShareSchema = z.object({
  participantId: objectIdSchema,
  startedAt: z.date().default(() => new Date()),
  endedAt: z.date().optional(),
  screenType: z.enum(['application', 'desktop', 'browser_tab']),
  title: z.string().max(200).optional(),
});

// Main Live Class creation schema
export const createLiveClassSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional(),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(100, 'Subject cannot exceed 100 characters')
    .trim(),
  teacher: objectIdSchema,
  classId: objectIdSchema.optional(),
  
  // Scheduling
  scheduledStartTime: z.string().datetime().transform((str) => new Date(str)),
  scheduledEndTime: z.string().datetime().transform((str) => new Date(str)),
  timeZone: timeZoneSchema,
  
  // Meeting Configuration
  meetingPassword: z.string().min(4).max(50).optional(),
  platform: z.nativeEnum(PlatformType).default(PlatformType.JITSI),
  platformSettings: z.record(z.any()).default({}),
  
  // Class Details
  type: z.nativeEnum(ClassType).default(ClassType.LECTURE),
  maxParticipants: z.number()
    .min(1, 'Must allow at least 1 participant')
    .max(1000, 'Cannot exceed 1000 participants')
    .default(100),
  isRecordingEnabled: z.boolean().default(false),
  isAutoRecord: z.boolean().default(false),
  waitingRoomEnabled: z.boolean().default(true),
  chatEnabled: z.boolean().default(true),
  screenShareEnabled: z.boolean().default(true),
  whiteboardEnabled: z.boolean().default(false),
  breakoutRoomsEnabled: z.boolean().default(false),
  
  // Content and Resources
  agenda: z.array(z.string().max(500)).default([]),
  materials: z.array(materialSchema).default([]),
  
  // Settings and Permissions
  isPublic: z.boolean().default(false),
  allowedUsers: z.array(objectIdSchema).default([]),
  requireApproval: z.boolean().default(false),
  tags: z.array(z.string().max(50)).default([]),
}).refine(
  (data) => data.scheduledEndTime > data.scheduledStartTime,
  {
    message: 'End time must be after start time',
    path: ['scheduledEndTime'],
  }
);

// Update Live Class schema (allows partial updates)
export const updateLiveClassSchema = z.object({
  id: objectIdSchema,
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional(),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(100, 'Subject cannot exceed 100 characters')
    .trim()
    .optional(),
  teacher: objectIdSchema.optional(),
  classId: objectIdSchema.optional(),
  
  // Scheduling
  scheduledStartTime: z.string().datetime().transform((str) => new Date(str)).optional(),
  scheduledEndTime: z.string().datetime().transform((str) => new Date(str)).optional(),
  timeZone: timeZoneSchema.optional(),
  
  // Meeting Configuration
  meetingPassword: z.string().min(4).max(50).optional(),
  platform: z.nativeEnum(PlatformType).optional(),
  platformSettings: z.record(z.any()).optional(),
  
  // Class Details
  type: z.nativeEnum(ClassType).optional(),
  maxParticipants: z.number()
    .min(1, 'Must allow at least 1 participant')
    .max(1000, 'Cannot exceed 1000 participants')
    .optional(),
  isRecordingEnabled: z.boolean().optional(),
  isAutoRecord: z.boolean().optional(),
  waitingRoomEnabled: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
  screenShareEnabled: z.boolean().optional(),
  whiteboardEnabled: z.boolean().optional(),
  breakoutRoomsEnabled: z.boolean().optional(),
  
  // Content and Resources
  agenda: z.array(z.string().max(500)).optional(),
  materials: z.array(materialSchema).optional(),
  
  // Settings and Permissions
  isPublic: z.boolean().optional(),
  allowedUsers: z.array(objectIdSchema).optional(),
  requireApproval: z.boolean().optional(),
  tags: z.array(z.string().max(50)).optional(),
});

// Live Class query/filter schema
export const liveClassQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20').refine(val => val <= 100, 'Limit cannot exceed 100'),
  teacher: objectIdSchema.optional(),
  status: z.nativeEnum(LiveClassStatus).optional(),
  type: z.nativeEnum(ClassType).optional(),
  platform: z.nativeEnum(PlatformType).optional(),
  subject: z.string().max(100).optional(),
  classId: objectIdSchema.optional(),
  isPublic: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  tags: z.string().optional().transform(str => str ? str.split(',').map(tag => tag.trim()) : undefined),
  search: z.string().max(200).optional(),
  sortBy: z.enum([
    'createdAt', 
    'scheduledStartTime', 
    'title', 
    'subject', 
    'participantCount',
    'status',
    'engagementScore'
  ]).default('scheduledStartTime'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  startDate: z.string().datetime().transform(str => new Date(str)).optional(),
  endDate: z.string().datetime().transform(str => new Date(str)).optional(),
  includeRecordings: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
  includeParticipants: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
});

// Join class schema
export const joinClassSchema = z.object({
  userId: objectIdSchema,
  role: z.nativeEnum(ParticipantRole).default(ParticipantRole.STUDENT),
  deviceInfo: z.object({
    type: z.string(),
    browser: z.string().optional(),
    os: z.string().optional(),
  }).optional(),
});

// Leave class schema
export const leaveClassSchema = z.object({
  userId: objectIdSchema,
});

// Start class schema
export const startClassSchema = z.object({
  teacherId: objectIdSchema,
  meetingUrl: z.string().url().optional(),
  platformSettings: z.record(z.any()).optional(),
});

// End class schema
export const endClassSchema = z.object({
  teacherId: objectIdSchema,
});

// Add material schema
export const addMaterialSchema = z.object({
  materials: z.array(materialSchema).min(1, 'At least one material is required'),
});

// Remove material schema
export const removeMaterialSchema = z.object({
  materialNames: z.array(z.string()).min(1, 'At least one material name is required'),
});

// Add recording schema
export const addRecordingSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
  duration: z.number().min(0),
  quality: z.nativeEnum(RecordingQuality).default(RecordingQuality.HD),
  size: z.number().min(0),
  isPublic: z.boolean().default(false),
  accessAllowedTo: z.array(objectIdSchema).default([]),
});

// Update recording schema
export const updateRecordingSchema = z.object({
  recordingId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  thumbnail: z.string().url().optional(),
  isPublic: z.boolean().optional(),
  accessAllowedTo: z.array(objectIdSchema).optional(),
});

// Delete recording schema
export const deleteRecordingSchema = z.object({
  recordingId: z.string().min(1),
});

// Participant management schemas
export const addParticipantsSchema = z.object({
  participants: z.array(z.object({
    userId: objectIdSchema,
    role: z.nativeEnum(ParticipantRole).default(ParticipantRole.STUDENT),
  })).min(1, 'At least one participant is required'),
});

export const removeParticipantsSchema = z.object({
  participantIds: z.array(objectIdSchema).min(1, 'At least one participant ID is required'),
});

export const updateParticipantRoleSchema = z.object({
  userId: objectIdSchema,
  role: z.nativeEnum(ParticipantRole),
});

export const banParticipantSchema = z.object({
  userId: objectIdSchema,
  reason: z.string().max(500).optional(),
});

export const unbanParticipantSchema = z.object({
  userId: objectIdSchema,
});

// Chat message schema
export const sendChatMessageSchema = z.object({
  senderId: objectIdSchema,
  message: z.string().min(1).max(1000),
  isPrivate: z.boolean().default(false),
  recipientId: objectIdSchema.optional(),
  messageType: z.enum(['text', 'file', 'poll', 'announcement']).default('text'),
  metadata: z.record(z.any()).optional(),
}).refine(
  (data) => !data.isPrivate || data.recipientId,
  {
    message: 'Recipient ID is required for private messages',
    path: ['recipientId'],
  }
);

// Delete chat message schema
export const deleteChatMessageSchema = z.object({
  messageId: z.string().min(1),
  senderId: objectIdSchema,
});

// Create poll schema
export const createPollSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  createdBy: objectIdSchema,
  isAnonymous: z.boolean().default(false),
  allowMultiple: z.boolean().default(false),
});

// Poll response schema
export const pollResponseSchema = z.object({
  pollId: z.string().min(1),
  participantId: objectIdSchema,
  selectedOptions: z.array(z.number().min(0)).min(1, 'At least one option must be selected'),
});

// End poll schema
export const endPollSchema = z.object({
  pollId: z.string().min(1),
  createdBy: objectIdSchema,
});

// Breakout room schemas
export const createBreakoutRoomSchema = z.object({
  name: z.string().min(1).max(100),
  maxParticipants: z.number().min(1).max(50).default(10),
  topic: z.string().max(200).optional(),
  participants: z.array(objectIdSchema).default([]),
});

export const updateBreakoutRoomSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  maxParticipants: z.number().min(1).max(50).optional(),
  topic: z.string().max(200).optional(),
  participants: z.array(objectIdSchema).optional(),
});

export const closeBreakoutRoomSchema = z.object({
  roomId: z.string().min(1),
});

// Screen share schemas
export const startScreenShareSchema = z.object({
  participantId: objectIdSchema,
  screenType: z.enum(['application', 'desktop', 'browser_tab']),
  title: z.string().max(200).optional(),
});

export const endScreenShareSchema = z.object({
  participantId: objectIdSchema,
});

// Whiteboard schemas
export const createWhiteboardSchema = z.object({
  createdBy: objectIdSchema,
  collaborators: z.array(objectIdSchema).default([]),
});

export const updateWhiteboardSchema = z.object({
  whiteboardId: z.string().min(1),
  content: z.string(),
  collaborators: z.array(objectIdSchema).optional(),
});

export const endWhiteboardSchema = z.object({
  whiteboardId: z.string().min(1),
  createdBy: objectIdSchema,
});

// Statistics query schema
export const statisticsQuerySchema = z.object({
  teacher: objectIdSchema.optional(),
  classId: objectIdSchema.optional(),
  startDate: z.string().datetime().transform(str => new Date(str)).optional(),
  endDate: z.string().datetime().transform(str => new Date(str)).optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  includeEngagement: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
  includeRecordings: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
});

// Bulk operations schemas
export const bulkCreateClassesSchema = z.object({
  classes: z.array(createLiveClassSchema).min(1).max(50),
});

export const bulkUpdateClassesSchema = z.object({
  classIds: z.array(objectIdSchema).min(1).max(50),
  updates: updateLiveClassSchema.omit({ id: true }),
});

export const bulkDeleteClassesSchema = z.object({
  classIds: z.array(objectIdSchema).min(1).max(50),
  confirmation: z.literal(true, { 
    errorMap: () => ({ message: 'Bulk delete confirmation is required' }) 
  }),
});

// Recording access schemas
export const updateRecordingAccessSchema = z.object({
  recordingId: z.string().min(1),
  isPublic: z.boolean(),
  accessAllowedTo: z.array(objectIdSchema).default([]),
});

export const recordingViewSchema = z.object({
  recordingId: z.string().min(1),
  viewerId: objectIdSchema,
});

export const recordingDownloadSchema = z.object({
  recordingId: z.string().min(1),
  downloaderId: objectIdSchema,
});

// Meeting platform integration schemas
export const zoomIntegrationSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  meetingSettings: z.object({
    host_video: z.boolean().default(true),
    participant_video: z.boolean().default(true),
    cn_meeting: z.boolean().default(false),
    in_meeting: z.boolean().default(false),
    join_before_host: z.boolean().default(true),
    mute_upon_entry: z.boolean().default(false),
    watermark: z.boolean().default(false),
    use_pmi: z.boolean().default(false),
    approval_type: z.number().min(0).max(2).default(2),
    audio: z.enum(['both', 'telephony', 'voip']).default('both'),
    auto_recording: z.enum(['local', 'cloud', 'none']).default('none'),
  }).optional(),
});

export const teamsIntegrationSchema = z.object({
  tenantId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  meetingSettings: z.record(z.any()).optional(),
});

export const meetIntegrationSchema = z.object({
  apiKey: z.string().min(1),
  meetingSettings: z.record(z.any()).optional(),
});

// WebRTC configuration schema
export const webrtcConfigSchema = z.object({
  iceServers: z.array(z.object({
    urls: z.union([z.string(), z.array(z.string())]),
    username: z.string().optional(),
    credential: z.string().optional(),
  })).default([]),
  stunServers: z.array(z.string().url()).default([]),
  turnServers: z.array(z.object({
    url: z.string().url(),
    username: z.string(),
    credential: z.string(),
  })).default([]),
});

// Export all schemas for API usage
export {
  participantSchema,
  materialSchema,
  recordingSchema,
  breakoutRoomSchema,
  chatMessageSchema,
  pollSchema,
  whiteboardSessionSchema,
  screenShareSchema,
  objectIdSchema,
  timeZoneSchema
};