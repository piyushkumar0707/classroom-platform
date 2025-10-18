import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Notification Priority Levels
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Notification Types
 */
export enum NotificationType {
  ASSIGNMENT = 'assignment',
  CLASS = 'class',
  ATTENDANCE = 'attendance',
  GRADE = 'grade',
  FEE = 'fee',
  DOUBT = 'doubt',
  MENTORSHIP = 'mentorship',
  SYSTEM = 'system',
  ANNOUNCEMENT = 'announcement',
  REMINDER = 'reminder'
}

/**
 * Notification Delivery Channels
 */
export enum DeliveryChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

/**
 * Notification Action Interface
 */
export interface INotificationAction {
  label: string;
  url: string;
  type: 'primary' | 'secondary';
}

/**
 * Notification Metadata Interface
 */
export interface INotificationMetadata {
  assignmentId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
  doubtId?: mongoose.Types.ObjectId;
  feeId?: mongoose.Types.ObjectId;
  entityType?: string;
  entityId?: mongoose.Types.ObjectId;
  customData?: Record<string, any>;
}

/**
 * Notification Read Receipt Interface
 */
export interface INotificationReadReceipt {
  readAt: Date;
  deviceType?: string;
  platform?: string;
  ipAddress?: string;
}

/**
 * Main Notification Interface
 */
export interface INotification extends Document {
  // Core Fields
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  
  // Recipient Information
  recipient: mongoose.Types.ObjectId;
  recipientModel: 'User';
  
  // Sender Information (optional - for user-to-user notifications)
  sender?: mongoose.Types.ObjectId;
  senderModel?: 'User';
  
  // Status and Timing
  isRead: boolean;
  readReceipt?: INotificationReadReceipt;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  scheduledFor?: Date;
  
  // Delivery Options
  deliveryChannels: DeliveryChannel[];
  deliveryStatus: {
    [key in DeliveryChannel]?: {
      sent: boolean;
      sentAt?: Date;
      delivered?: boolean;
      deliveredAt?: Date;
      error?: string;
    };
  };
  
  // Rich Content
  imageUrl?: string;
  actions?: INotificationAction[];
  metadata?: INotificationMetadata;
  
  // Categorization and Filtering
  category?: string;
  tags?: string[];
  
  // Bulk Operation Support
  campaignId?: string;
  
  // Methods
  markAsRead(deviceInfo?: any): Promise<INotification>;
  markAsUnread(): Promise<INotification>;
  updateDeliveryStatus(channel: DeliveryChannel, status: any): Promise<INotification>;
}

/**
 * Notification Schema Definition
 */
const NotificationSchema = new Schema<INotification>({
  // Core Fields
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    minlength: [3, 'Title must be at least 3 characters long']
  },
  
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters'],
    minlength: [10, 'Message must be at least 10 characters long']
  },
  
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: [true, 'Notification type is required'],
    index: true
  },
  
  priority: {
    type: String,
    enum: Object.values(NotificationPriority),
    default: NotificationPriority.MEDIUM,
    index: true
  },
  
  // Recipient Information
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required'],
    index: true
  },
  
  recipientModel: {
    type: String,
    default: 'User'
  },
  
  // Sender Information
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  senderModel: {
    type: String,
    default: 'User'
  },
  
  // Status and Timing
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  readReceipt: {
    readAt: {
      type: Date
    },
    deviceType: {
      type: String,
      maxlength: 50
    },
    platform: {
      type: String,
      maxlength: 50
    },
    ipAddress: {
      type: String,
      maxlength: 45 // IPv6 max length
    }
  },
  
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index for automatic deletion
  },
  
  scheduledFor: {
    type: Date,
    index: true
  },
  
  // Delivery Options
  deliveryChannels: [{
    type: String,
    enum: Object.values(DeliveryChannel),
    default: [DeliveryChannel.IN_APP]
  }],
  
  deliveryStatus: {
    type: Map,
    of: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      error: { type: String, maxlength: 500 }
    },
    default: {}
  },
  
  // Rich Content
  imageUrl: {
    type: String,
    validate: {
      validator: function(url: string) {
        if (!url) return true; // Optional field
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
      },
      message: 'Invalid image URL format'
    }
  },
  
  actions: [{
    label: {
      type: String,
      required: true,
      maxlength: 50
    },
    url: {
      type: String,
      required: true,
      maxlength: 500
    },
    type: {
      type: String,
      enum: ['primary', 'secondary'],
      default: 'secondary'
    }
  }],
  
  metadata: {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment'
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class'
    },
    doubtId: {
      type: Schema.Types.ObjectId,
      ref: 'Doubt'
    },
    feeId: {
      type: Schema.Types.ObjectId,
      ref: 'Fee'
    },
    entityType: {
      type: String,
      maxlength: 50
    },
    entityId: {
      type: Schema.Types.ObjectId
    },
    customData: {
      type: Schema.Types.Mixed,
      validate: {
        validator: function(data: any) {
          return !data || (typeof data === 'object' && JSON.stringify(data).length <= 2000);
        },
        message: 'Custom data must be a valid object and not exceed 2KB'
      }
    }
  },
  
  // Categorization
  category: {
    type: String,
    maxlength: 50,
    trim: true,
    index: true
  },
  
  tags: [{
    type: String,
    maxlength: 30,
    trim: true
  }],
  
  // Bulk Operations
  campaignId: {
    type: String,
    maxlength: 100,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound Indexes for Performance
NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ recipient: 1, type: 1 });
NotificationSchema.index({ recipient: 1, priority: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ scheduledFor: 1, createdAt: 1 });
NotificationSchema.index({ campaignId: 1 });

// Text Index for Search
NotificationSchema.index({
  title: 'text',
  message: 'text',
  category: 'text',
  tags: 'text'
});

/**
 * Instance Methods
 */

// Mark notification as read
NotificationSchema.methods.markAsRead = function(deviceInfo: any = {}) {
  this.isRead = true;
  this.readReceipt = {
    readAt: new Date(),
    deviceType: deviceInfo?.deviceType,
    platform: deviceInfo?.platform,
    ipAddress: deviceInfo?.ipAddress
  };
  return this.save();
};

// Mark notification as unread
NotificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.readReceipt = undefined;
  return this.save();
};

// Update delivery status for a specific channel
NotificationSchema.methods.updateDeliveryStatus = function(channel: DeliveryChannel, status: any) {
  if (!this.deliveryStatus) {
    this.deliveryStatus = new Map();
  }
  this.deliveryStatus.set(channel, {
    ...this.deliveryStatus.get(channel),
    ...status,
    ...(status.sent && !this.deliveryStatus.get(channel)?.sentAt && { sentAt: new Date() }),
    ...(status.delivered && !this.deliveryStatus.get(channel)?.deliveredAt && { deliveredAt: new Date() })
  });
  return this.save();
};

/**
 * Static Methods
 */

// Get notifications with pagination and filtering
NotificationSchema.statics.getNotificationsPaginated = function(
  recipientId: mongoose.Types.ObjectId,
  options: {
    page?: number;
    limit?: number;
    type?: NotificationType;
    isRead?: boolean;
    priority?: NotificationPriority;
    category?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeExpired?: boolean;
  } = {}
) {
  const {
    page = 1,
    limit = 20,
    type,
    isRead,
    priority,
    category,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeExpired = false
  } = options;

  const query: any = { recipient: recipientId };

  // Apply filters
  if (type) query.type = type;
  if (isRead !== undefined) query.isRead = isRead;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  
  // Handle expired notifications
  if (!includeExpired) {
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  const skip = (page - 1) * limit;
  const sort: any = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Add text score for search relevance
  if (search) {
    sort.score = { $meta: 'textScore' };
  }

  return Promise.all([
    this.find(query)
      .populate('sender', 'name email avatar role')
      .populate('metadata.assignmentId', 'title dueDate')
      .populate('metadata.classId', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]).then(([notifications, total]) => ({
    notifications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  }));
};

// Get notification statistics
NotificationSchema.statics.getNotificationStats = function(recipientId: mongoose.Types.ObjectId) {
  return Promise.all([
    // Total count
    this.countDocuments({ recipient: recipientId }),
    
    // Unread count
    this.countDocuments({ recipient: recipientId, isRead: false }),
    
    // Count by type
    this.aggregate([
      { $match: { recipient: recipientId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    
    // Count by priority
    this.aggregate([
      { $match: { recipient: recipientId, isRead: false } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]),
    
    // Recent activity (last 7 days)
    this.aggregate([
      {
        $match: {
          recipient: recipientId,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]).then(([total, unread, byType, byPriority, recentActivity]) => ({
    total,
    unread,
    byType: byType.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byPriority: byPriority.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    recentActivity: recentActivity.map((item: any) => ({
      date: item._id,
      count: item.count
    }))
  }));
};

// Mark multiple notifications as read
NotificationSchema.statics.markMultipleAsRead = function(
  recipientId: mongoose.Types.ObjectId,
  notificationIds?: mongoose.Types.ObjectId[]
) {
  const query: any = { recipient: recipientId, isRead: false };
  
  if (notificationIds && notificationIds.length > 0) {
    query._id = { $in: notificationIds };
  }

  return this.updateMany(query, {
    $set: {
      isRead: true,
      'readReceipt.readAt': new Date()
    }
  });
};

// Create notification with automatic delivery
NotificationSchema.statics.createNotification = async function(notificationData: Partial<INotification>) {
  const notification = new this(notificationData);
  await notification.save();
  
  // Initialize delivery status for all channels
  for (const channel of notification.deliveryChannels) {
    await notification.updateDeliveryStatus(channel, { sent: false });
  }
  
  // TODO: Trigger delivery services (WebSocket, Email, Push, SMS)
  // This would be implemented in a separate service layer
  
  return notification;
};

// Cleanup expired notifications
NotificationSchema.statics.cleanupExpiredNotifications = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Pre-save middleware
NotificationSchema.pre('save', function(next) {
  // Set default delivery channel if none specified
  if (!this.deliveryChannels || this.deliveryChannels.length === 0) {
    this.deliveryChannels = [DeliveryChannel.IN_APP];
  }
  
  // Set expiry for certain notification types (optional)
  if (!this.expiresAt && this.type === NotificationType.REMINDER) {
    // Reminders expire after 30 days
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Create and export the model
const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
export { NotificationSchema };