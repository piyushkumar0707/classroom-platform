import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for Doubt Response
 */
export interface IDoubtResponse {
  message: string;
  respondedBy: mongoose.Types.ObjectId;
  attachments?: string[];
  isResolution: boolean;
  respondedAt: Date;
  upvotes: number;
  downvotes: number;
}

/**
 * Interface for Doubt Document
 */
export interface IDoubt extends Document {
  _id: string;
  title: string;
  description: string;
  subject: string;
  topic?: string;
  class?: mongoose.Types.ObjectId;
  askedBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  attachments?: string[];
  responses: IDoubtResponse[];
  upvotes: number;
  downvotes: number;
  viewCount: number;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Doubt Response Schema
 */
const DoubtResponseSchema = new Schema<IDoubtResponse>({
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Response message cannot exceed 2000 characters']
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attachments: [{
    type: String,
    validate: {
      validator: function(v: string) {
        // Basic URL validation
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid attachment URL'
    }
  }],
  isResolution: {
    type: Boolean,
    default: false
  },
  upvotes: {
    type: Number,
    default: 0,
    min: 0
  },
  downvotes: {
    type: Number,
    default: 0,
    min: 0
  },
  respondedAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Doubt Schema
 */
const DoubtSchema = new Schema<IDoubt>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    enum: {
      values: ['mathematics', 'physics', 'chemistry', 'biology', 'computer-science', 'english', 'history', 'geography', 'economics', 'other'],
      message: 'Invalid subject selected'
    }
  },
  topic: {
    type: String,
    trim: true,
    maxlength: [100, 'Topic cannot exceed 100 characters']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: false
  },
  askedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  status: {
    type: String,
    enum: {
      values: ['open', 'in_progress', 'resolved', 'closed'],
      message: 'Invalid status'
    },
    default: 'open'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Invalid priority'
    },
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  attachments: [{
    type: String,
    validate: {
      validator: function(v: string) {
        // Basic URL validation for file attachments
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid attachment URL'
    }
  }],
  responses: [DoubtResponseSchema],
  upvotes: {
    type: Number,
    default: 0,
    min: 0
  },
  downvotes: {
    type: Number,
    default: 0,
    min: 0
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  resolvedAt: {
    type: Date,
    required: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: false
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
DoubtSchema.index({ askedBy: 1, createdAt: -1 });
DoubtSchema.index({ subject: 1, status: 1 });
DoubtSchema.index({ assignedTo: 1, status: 1 });
DoubtSchema.index({ tags: 1 });
DoubtSchema.index({ createdAt: -1 });
DoubtSchema.index({ priority: 1, status: 1 });

// Virtual for response count
DoubtSchema.virtual('responseCount').get(function() {
  return this.responses.length;
});

// Virtual for net votes
DoubtSchema.virtual('netVotes').get(function() {
  return this.upvotes - this.downvotes;
});

// Pre-save middleware to update resolvedAt when status changes to resolved
DoubtSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

// Static method to find doubts with pagination
DoubtSchema.statics.findWithPagination = function(filter: any, page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  return this.find(filter)
    .populate('askedBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('resolvedBy', 'name email role')
    .populate('responses.respondedBy', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get doubt statistics
DoubtSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalDoubts: { $sum: 1 },
        openDoubts: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        resolvedDoubts: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        inProgressDoubts: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        averageResponseTime: { 
          $avg: { 
            $cond: [
              { $ne: ['$resolvedAt', null] },
              { $subtract: ['$resolvedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalDoubts: 0,
    openDoubts: 0,
    resolvedDoubts: 0,
    inProgressDoubts: 0,
    averageResponseTime: null
  };
};

// Create and export the model
const Doubt = mongoose.models.Doubt || mongoose.model<IDoubt>('Doubt', DoubtSchema);

export default Doubt;
export { DoubtSchema };