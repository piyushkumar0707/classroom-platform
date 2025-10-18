import mongoose, { Schema, Document, Types } from 'mongoose';

// Enums for better type safety and consistency
export enum LiveClassStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  RECORDED = 'recorded'
}

export enum ParticipantRole {
  TEACHER = 'teacher',
  STUDENT = 'student',
  GUEST = 'guest',
  MODERATOR = 'moderator'
}

export enum ClassType {
  LECTURE = 'lecture',
  TUTORIAL = 'tutorial',
  WORKSHOP = 'workshop',
  SEMINAR = 'seminar',
  DISCUSSION = 'discussion',
  EXAM = 'exam',
  PRESENTATION = 'presentation'
}

export enum RecordingQuality {
  SD = 'sd',
  HD = 'hd',
  FULL_HD = 'full_hd'
}

export enum PlatformType {
  ZOOM = 'zoom',
  TEAMS = 'teams',
  MEET = 'meet',
  WEBEX = 'webex',
  CUSTOM = 'custom',
  JITSI = 'jitsi'
}

// Interface definitions
export interface IParticipant {
  userId: Types.ObjectId;
  role: ParticipantRole;
  joinedAt?: Date;
  leftAt?: Date;
  duration?: number;
  isPresent: boolean;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  deviceInfo?: {
    type: string;
    browser?: string;
    os?: string;
  };
}

export interface IRecording {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  duration: number;
  quality: RecordingQuality;
  size: number;
  createdAt: Date;
  isProcessed: boolean;
  downloadCount: number;
  viewCount: number;
  isPublic: boolean;
  accessAllowedTo: Types.ObjectId[];
}

export interface IBreakoutRoom {
  id: string;
  name: string;
  participants: Types.ObjectId[];
  createdAt: Date;
  endedAt?: Date;
  maxParticipants: number;
  topic?: string;
}

export interface IChatMessage {
  id: string;
  senderId: Types.ObjectId;
  message: string;
  timestamp: Date;
  isPrivate: boolean;
  recipientId?: Types.ObjectId;
  messageType: 'text' | 'file' | 'poll' | 'announcement';
  metadata?: Record<string, any>;
}

export interface IScreenShare {
  participantId: Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  screenType: 'application' | 'desktop' | 'browser_tab';
  title?: string;
}

export interface IPoll {
  id: string;
  question: string;
  options: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  endedAt?: Date;
  responses: {
    participantId: Types.ObjectId;
    selectedOption: number;
    timestamp: Date;
  }[];
  isAnonymous: boolean;
  allowMultiple: boolean;
}

export interface IWhiteboardSession {
  id: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  endedAt?: Date;
  collaborators: Types.ObjectId[];
  content: string; // Base64 encoded or JSON representation
  version: number;
}

export interface ILiveClass extends Document {
  title: string;
  description?: string;
  subject: string;
  teacher: Types.ObjectId;
  classId?: Types.ObjectId;
  
  // Scheduling
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  duration: number; // in minutes
  timeZone: string;
  
  // Meeting Configuration
  meetingId?: string;
  meetingPassword?: string;
  meetingUrl?: string;
  platform: PlatformType;
  platformSettings?: Record<string, any>;
  
  // Class Details
  type: ClassType;
  status: LiveClassStatus;
  maxParticipants: number;
  isRecordingEnabled: boolean;
  isAutoRecord: boolean;
  waitingRoomEnabled: boolean;
  chatEnabled: boolean;
  screenShareEnabled: boolean;
  whiteboardEnabled: boolean;
  breakoutRoomsEnabled: boolean;
  
  // Participants
  participants: IParticipant[];
  waitingList: Types.ObjectId[];
  bannedUsers: Types.ObjectId[];
  
  // Content and Resources
  agenda?: string[];
  materials: {
    name: string;
    url: string;
    type: string;
    size?: number;
    uploadedAt: Date;
  }[];
  
  // Recordings and Media
  recordings: IRecording[];
  
  // Interactive Features
  breakoutRooms: IBreakoutRoom[];
  chatMessages: IChatMessage[];
  polls: IPoll[];
  whiteboardSessions: IWhiteboardSession[];
  screenShares: IScreenShare[];
  
  // Analytics and Metadata
  totalJoins: number;
  peakConcurrentUsers: number;
  averageSessionDuration: number;
  engagementScore?: number;
  
  // Settings and Permissions
  isPublic: boolean;
  allowedUsers: Types.ObjectId[];
  requireApproval: boolean;
  tags: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods will be defined below
}

const liveClassSchema = new Schema<ILiveClass>(
  {
    title: {
      type: String,
      required: [true, 'Live class title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters'],
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher is required'],
      index: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      index: true,
    },
    
    // Scheduling
    scheduledStartTime: {
      type: Date,
      required: [true, 'Scheduled start time is required'],
      index: true,
    },
    scheduledEndTime: {
      type: Date,
      required: [true, 'Scheduled end time is required'],
      validate: {
        validator: function(this: ILiveClass, value: Date) {
          return value > this.scheduledStartTime;
        },
        message: 'End time must be after start time',
      },
    },
    actualStartTime: {
      type: Date,
    },
    actualEndTime: {
      type: Date,
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [480, 'Duration cannot exceed 8 hours'],
    },
    timeZone: {
      type: String,
      default: 'UTC',
    },
    
    // Meeting Configuration
    meetingId: {
      type: String,
      index: true,
    },
    meetingPassword: {
      type: String,
    },
    meetingUrl: {
      type: String,
    },
    platform: {
      type: String,
      enum: Object.values(PlatformType),
      default: PlatformType.JITSI,
    },
    platformSettings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    
    // Class Details
    type: {
      type: String,
      enum: Object.values(ClassType),
      default: ClassType.LECTURE,
    },
    status: {
      type: String,
      enum: Object.values(LiveClassStatus),
      default: LiveClassStatus.SCHEDULED,
      index: true,
    },
    maxParticipants: {
      type: Number,
      default: 100,
      min: [1, 'Must allow at least 1 participant'],
      max: [1000, 'Cannot exceed 1000 participants'],
    },
    isRecordingEnabled: {
      type: Boolean,
      default: false,
    },
    isAutoRecord: {
      type: Boolean,
      default: false,
    },
    waitingRoomEnabled: {
      type: Boolean,
      default: true,
    },
    chatEnabled: {
      type: Boolean,
      default: true,
    },
    screenShareEnabled: {
      type: Boolean,
      default: true,
    },
    whiteboardEnabled: {
      type: Boolean,
      default: false,
    },
    breakoutRoomsEnabled: {
      type: Boolean,
      default: false,
    },
    
    // Participants
    participants: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      role: {
        type: String,
        enum: Object.values(ParticipantRole),
        default: ParticipantRole.STUDENT,
      },
      joinedAt: Date,
      leftAt: Date,
      duration: {
        type: Number,
        default: 0,
      },
      isPresent: {
        type: Boolean,
        default: false,
      },
      connectionQuality: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      deviceInfo: {
        type: {
          type: String,
        },
        browser: String,
        os: String,
      },
    }],
    waitingList: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    bannedUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    
    // Content and Resources
    agenda: [String],
    materials: [{
      name: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        required: true,
      },
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Recordings and Media
    recordings: [{
      id: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      thumbnail: String,
      duration: {
        type: Number,
        required: true,
      },
      quality: {
        type: String,
        enum: Object.values(RecordingQuality),
        default: RecordingQuality.HD,
      },
      size: {
        type: Number,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      isProcessed: {
        type: Boolean,
        default: false,
      },
      downloadCount: {
        type: Number,
        default: 0,
      },
      viewCount: {
        type: Number,
        default: 0,
      },
      isPublic: {
        type: Boolean,
        default: false,
      },
      accessAllowedTo: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
    }],
    
    // Interactive Features
    breakoutRooms: [{
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
      createdAt: {
        type: Date,
        default: Date.now,
      },
      endedAt: Date,
      maxParticipants: {
        type: Number,
        default: 10,
      },
      topic: String,
    }],
    
    chatMessages: [{
      id: {
        type: String,
        required: true,
      },
      senderId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      isPrivate: {
        type: Boolean,
        default: false,
      },
      recipientId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      messageType: {
        type: String,
        enum: ['text', 'file', 'poll', 'announcement'],
        default: 'text',
      },
      metadata: Schema.Types.Mixed,
    }],
    
    polls: [{
      id: {
        type: String,
        required: true,
      },
      question: {
        type: String,
        required: true,
      },
      options: [String],
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      endedAt: Date,
      responses: [{
        participantId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        selectedOption: {
          type: Number,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      }],
      isAnonymous: {
        type: Boolean,
        default: false,
      },
      allowMultiple: {
        type: Boolean,
        default: false,
      },
    }],
    
    whiteboardSessions: [{
      id: {
        type: String,
        required: true,
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      endedAt: Date,
      collaborators: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
      content: String,
      version: {
        type: Number,
        default: 1,
      },
    }],
    
    screenShares: [{
      participantId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      startedAt: {
        type: Date,
        default: Date.now,
      },
      endedAt: Date,
      screenType: {
        type: String,
        enum: ['application', 'desktop', 'browser_tab'],
        required: true,
      },
      title: String,
    }],
    
    // Analytics and Metadata
    totalJoins: {
      type: Number,
      default: 0,
    },
    peakConcurrentUsers: {
      type: Number,
      default: 0,
    },
    averageSessionDuration: {
      type: Number,
      default: 0,
    },
    engagementScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    
    // Settings and Permissions
    isPublic: {
      type: Boolean,
      default: false,
    },
    allowedUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    requireApproval: {
      type: Boolean,
      default: false,
    },
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
liveClassSchema.index({ teacher: 1, scheduledStartTime: -1 });
liveClassSchema.index({ status: 1, scheduledStartTime: 1 });
liveClassSchema.index({ subject: 1, scheduledStartTime: -1 });
liveClassSchema.index({ 'participants.userId': 1 });
liveClassSchema.index({ createdAt: -1 });
liveClassSchema.index({ tags: 1 });
liveClassSchema.index({ classId: 1, scheduledStartTime: -1 });

// Virtual properties
liveClassSchema.virtual('isLive').get(function(this: ILiveClass) {
  return this.status === LiveClassStatus.LIVE;
});

liveClassSchema.virtual('hasEnded').get(function(this: ILiveClass) {
  return this.status === LiveClassStatus.ENDED || this.status === LiveClassStatus.RECORDED;
});

liveClassSchema.virtual('participantCount').get(function(this: ILiveClass) {
  return this.participants.length;
});

liveClassSchema.virtual('currentParticipants').get(function(this: ILiveClass) {
  return this.participants.filter(p => p.isPresent);
});

liveClassSchema.virtual('recordingCount').get(function(this: ILiveClass) {
  return this.recordings.length;
});

liveClassSchema.virtual('actualDuration').get(function(this: ILiveClass) {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.round((this.actualEndTime.getTime() - this.actualStartTime.getTime()) / (1000 * 60));
  }
  return 0;
});

// Instance methods
liveClassSchema.methods.joinClass = function(userId: string, role: ParticipantRole = ParticipantRole.STUDENT) {
  const participant = this.participants.find((p: IParticipant) => p.userId.toString() === userId);
  
  if (participant) {
    participant.isPresent = true;
    participant.joinedAt = new Date();
    participant.leftAt = undefined;
  } else {
    this.participants.push({
      userId: new Types.ObjectId(userId),
      role,
      joinedAt: new Date(),
      isPresent: true,
    });
  }
  
  this.totalJoins += 1;
  const currentCount = this.currentParticipants.length;
  if (currentCount > this.peakConcurrentUsers) {
    this.peakConcurrentUsers = currentCount;
  }
  
  return this.save();
};

liveClassSchema.methods.leaveClass = function(userId: string) {
  const participant = this.participants.find((p: IParticipant) => p.userId.toString() === userId);
  
  if (participant && participant.isPresent) {
    participant.isPresent = false;
    participant.leftAt = new Date();
    
    if (participant.joinedAt) {
      const duration = Math.round((participant.leftAt.getTime() - participant.joinedAt.getTime()) / (1000 * 60));
      participant.duration = (participant.duration || 0) + duration;
    }
  }
  
  this.updateAverageSessionDuration();
  return this.save();
};

liveClassSchema.methods.startClass = function() {
  if (this.status === LiveClassStatus.SCHEDULED) {
    this.status = LiveClassStatus.LIVE;
    this.actualStartTime = new Date();
    
    if (this.isAutoRecord && this.isRecordingEnabled) {
      // Trigger recording start
    }
  }
  return this.save();
};

liveClassSchema.methods.endClass = function() {
  if (this.status === LiveClassStatus.LIVE) {
    this.status = this.recordings.length > 0 ? LiveClassStatus.RECORDED : LiveClassStatus.ENDED;
    this.actualEndTime = new Date();
    
    // Mark all present participants as left
    this.participants.forEach((participant: IParticipant) => {
      if (participant.isPresent) {
        participant.isPresent = false;
        participant.leftAt = new Date();
        
        if (participant.joinedAt) {
          const duration = Math.round((participant.leftAt.getTime() - participant.joinedAt.getTime()) / (1000 * 60));
          participant.duration = (participant.duration || 0) + duration;
        }
      }
    });
    
    this.updateAverageSessionDuration();
    this.calculateEngagementScore();
  }
  return this.save();
};

liveClassSchema.methods.addRecording = function(recording: Partial<IRecording>) {
  const recordingData = {
    id: recording.id || new Types.ObjectId().toString(),
    title: recording.title || `${this.title} - Recording`,
    url: recording.url!,
    thumbnail: recording.thumbnail,
    duration: recording.duration!,
    quality: recording.quality || RecordingQuality.HD,
    size: recording.size!,
    createdAt: new Date(),
    isProcessed: recording.isProcessed || false,
    downloadCount: 0,
    viewCount: 0,
    isPublic: recording.isPublic || false,
    accessAllowedTo: recording.accessAllowedTo || [],
  };
  
  this.recordings.push(recordingData as IRecording);
  
  if (this.status === LiveClassStatus.ENDED) {
    this.status = LiveClassStatus.RECORDED;
  }
  
  return this.save();
};

liveClassSchema.methods.updateAverageSessionDuration = function() {
  const totalDuration = this.participants.reduce((sum: number, participant: IParticipant) => {
    return sum + (participant.duration || 0);
  }, 0);
  
  const participantCount = this.participants.length;
  this.averageSessionDuration = participantCount > 0 ? Math.round(totalDuration / participantCount) : 0;
};

liveClassSchema.methods.calculateEngagementScore = function() {
  if (this.participants.length === 0) {
    this.engagementScore = 0;
    return;
  }
  
  const scheduledDuration = this.duration;
  const avgDuration = this.averageSessionDuration;
  const attendanceRate = this.participants.length / this.maxParticipants;
  const chatActivity = Math.min(this.chatMessages.length / this.participants.length, 10) / 10;
  const pollActivity = Math.min(this.polls.length, 5) / 5;
  
  // Weighted engagement score (0-100)
  const durationScore = Math.min(avgDuration / scheduledDuration, 1) * 40;
  const attendanceScore = attendanceRate * 30;
  const chatScore = chatActivity * 20;
  const pollScore = pollActivity * 10;
  
  this.engagementScore = Math.round(durationScore + attendanceScore + chatScore + pollScore);
};

// Static methods
liveClassSchema.statics.getUpcomingClasses = function(teacherId?: string, limit: number = 10) {
  const query: any = {
    status: LiveClassStatus.SCHEDULED,
    scheduledStartTime: { $gte: new Date() }
  };
  
  if (teacherId) {
    query.teacher = teacherId;
  }
  
  return this.find(query)
    .populate('teacher', 'name email')
    .populate('participants.userId', 'name email')
    .sort({ scheduledStartTime: 1 })
    .limit(limit);
};

liveClassSchema.statics.getLiveClasses = function(teacherId?: string) {
  const query: any = { status: LiveClassStatus.LIVE };
  
  if (teacherId) {
    query.teacher = teacherId;
  }
  
  return this.find(query)
    .populate('teacher', 'name email')
    .populate('participants.userId', 'name email')
    .sort({ actualStartTime: -1 });
};

liveClassSchema.statics.getClassHistory = function(teacherId?: string, limit: number = 20) {
  const query: any = {
    status: { $in: [LiveClassStatus.ENDED, LiveClassStatus.RECORDED] }
  };
  
  if (teacherId) {
    query.teacher = teacherId;
  }
  
  return this.find(query)
    .populate('teacher', 'name email')
    .sort({ actualEndTime: -1 })
    .limit(limit);
};

liveClassSchema.statics.getUserClasses = function(userId: string, status?: LiveClassStatus) {
  const query: any = {
    $or: [
      { teacher: userId },
      { 'participants.userId': userId },
      { allowedUsers: userId }
    ]
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('teacher', 'name email')
    .sort({ scheduledStartTime: -1 });
};

liveClassSchema.statics.getClassStatistics = function(teacherId?: string, startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  
  if (teacherId) {
    matchStage.teacher = new Types.ObjectId(teacherId);
  }
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalClasses: { $sum: 1 },
        completedClasses: {
          $sum: {
            $cond: [
              { $in: ['$status', [LiveClassStatus.ENDED, LiveClassStatus.RECORDED]] },
              1,
              0
            ]
          }
        },
        totalParticipants: { $sum: { $size: '$participants' } },
        totalRecordings: { $sum: { $size: '$recordings' } },
        averageParticipants: { $avg: { $size: '$participants' } },
        averageDuration: { $avg: '$averageSessionDuration' },
        totalDuration: { $sum: '$actualDuration' },
        averageEngagement: { $avg: '$engagementScore' }
      }
    }
  ]);
};

// Pre-save middleware
liveClassSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('scheduledStartTime') || this.isModified('scheduledEndTime')) {
    const start = this.scheduledStartTime;
    const end = this.scheduledEndTime;
    this.duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }
  next();
});

// Post-save middleware for real-time updates
liveClassSchema.post('save', function(doc) {
  // Emit socket event for real-time updates
  // SocketManager.emit('liveClassUpdated', doc._id, doc);
});

const LiveClassModel = mongoose.models.LiveClass || mongoose.model<ILiveClass>('LiveClass', liveClassSchema);

export default LiveClassModel;