import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for Assignment Submission
 */
export interface IAssignmentSubmission {
  student: mongoose.Types.ObjectId;
  content: string;
  attachments?: string[];
  submittedAt: Date;
  isLate: boolean;
  marks?: number;
  feedback?: string;
  gradedBy?: mongoose.Types.ObjectId;
  gradedAt?: Date;
}

/**
 * Interface for Assignment Document
 */
export interface IAssignment extends Document {
  _id: string;
  title: string;
  description: string;
  instructions?: string;
  subject: string;
  dueDate: Date;
  maxMarks: number;
  attachments?: string[];
  createdBy: mongoose.Types.ObjectId;
  class?: mongoose.Types.ObjectId;
  assignmentType: 'homework' | 'quiz' | 'project' | 'test' | 'lab';
  isPublished: boolean;
  submissionsAllowed: boolean;
  lateSubmissionAllowed: boolean;
  lateSubmissionPenalty?: number;
  submissions: IAssignmentSubmission[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Assignment Submission Schema
 */
const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Submission content is required'],
    trim: true,
    maxlength: [10000, 'Submission content cannot exceed 10000 characters']
  },
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
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  marks: {
    type: Number,
    min: 0,
    validate: {
      validator: function(this: IAssignmentSubmission, marks: number) {
        // We can't directly access the parent assignment here, so we'll validate in the pre-save hook
        return marks >= 0;
      },
      message: 'Marks cannot be negative'
    }
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [2000, 'Feedback cannot exceed 2000 characters']
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  }
});

/**
 * Assignment Schema
 */
const AssignmentSchema = new Schema<IAssignment>({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [3000, 'Instructions cannot exceed 3000 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    enum: {
      values: ['mathematics', 'physics', 'chemistry', 'biology', 'computer-science', 'english', 'history', 'geography', 'economics', 'other'],
      message: 'Invalid subject selected'
    }
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    validate: {
      validator: function(date: Date) {
        return date > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  maxMarks: {
    type: Number,
    required: [true, 'Maximum marks is required'],
    min: [1, 'Maximum marks must be at least 1'],
    max: [1000, 'Maximum marks cannot exceed 1000']
  },
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  assignmentType: {
    type: String,
    enum: {
      values: ['homework', 'quiz', 'project', 'test', 'lab'],
      message: 'Invalid assignment type'
    },
    default: 'homework'
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  submissionsAllowed: {
    type: Boolean,
    default: true
  },
  lateSubmissionAllowed: {
    type: Boolean,
    default: false
  },
  lateSubmissionPenalty: {
    type: Number,
    min: [0, 'Penalty cannot be negative'],
    max: [100, 'Penalty cannot exceed 100%'],
    default: 0
  },
  submissions: [AssignmentSubmissionSchema],
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }]
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
AssignmentSchema.index({ createdBy: 1, createdAt: -1 });
AssignmentSchema.index({ subject: 1, dueDate: 1 });
AssignmentSchema.index({ class: 1, isPublished: 1 });
AssignmentSchema.index({ dueDate: 1, submissionsAllowed: 1 });
AssignmentSchema.index({ tags: 1 });
AssignmentSchema.index({ createdAt: -1 });

// Virtual for submission count
AssignmentSchema.virtual('submissionCount').get(function() {
  return this.submissions.length;
});

// Virtual for pending submissions
AssignmentSchema.virtual('pendingSubmissions').get(function() {
  return this.submissions.filter(sub => !sub.marks && !sub.gradedAt).length;
});

// Virtual for average marks
AssignmentSchema.virtual('averageMarks').get(function() {
  const gradedSubmissions = this.submissions.filter(sub => sub.marks !== undefined);
  if (gradedSubmissions.length === 0) return 0;
  const total = gradedSubmissions.reduce((sum, sub) => sum + (sub.marks || 0), 0);
  return Math.round((total / gradedSubmissions.length) * 100) / 100;
});

// Virtual for assignment status
AssignmentSchema.virtual('status').get(function() {
  const now = new Date();
  if (!this.isPublished) return 'draft';
  if (this.dueDate < now && this.submissionsAllowed) return 'overdue';
  if (this.dueDate < now) return 'completed';
  return 'active';
});

// Pre-save middleware to validate submission marks against assignment maxMarks
AssignmentSchema.pre('save', function(next) {
  // Validate submission marks
  for (const submission of this.submissions) {
    if (submission.marks !== undefined && submission.marks > this.maxMarks) {
      return next(new Error(`Submission marks cannot exceed assignment maximum marks (${this.maxMarks})`));
    }
    
    // Check if submission is late
    if (submission.submittedAt > this.dueDate) {
      submission.isLate = true;
    }
  }
  
  next();
});

// Static method to find assignments with pagination
AssignmentSchema.statics.findWithPagination = function(filter: any, page: number = 1, limit: number = 10, sort: any = { createdAt: -1 }) {
  const skip = (page - 1) * limit;
  return this.find(filter)
    .populate('createdBy', 'name email role')
    .populate('class', 'name subject')
    .populate('submissions.student', 'name email')
    .populate('submissions.gradedBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Static method to get assignment statistics
AssignmentSchema.statics.getStatistics = async function(teacherId?: string) {
  const matchStage = teacherId ? { createdBy: new mongoose.Types.ObjectId(teacherId) } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAssignments: { $sum: 1 },
        publishedAssignments: { $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] } },
        draftAssignments: { $sum: { $cond: [{ $eq: ['$isPublished', false] }, 1, 0] } },
        overdueAssignments: { 
          $sum: { 
            $cond: [
              { 
                $and: [
                  { $lt: ['$dueDate', new Date()] },
                  { $eq: ['$submissionsAllowed', true] }
                ]
              }, 
              1, 
              0
            ]
          }
        },
        totalSubmissions: { 
          $sum: { $size: '$submissions' }
        },
        averageMaxMarks: { $avg: '$maxMarks' }
      }
    }
  ]);
  
  return stats[0] || {
    totalAssignments: 0,
    publishedAssignments: 0,
    draftAssignments: 0,
    overdueAssignments: 0,
    totalSubmissions: 0,
    averageMaxMarks: 0
  };
};

// Create and export the model
const Assignment = mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);

export default Assignment;
export { AssignmentSchema };