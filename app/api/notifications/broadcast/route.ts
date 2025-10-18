import { NextRequest, NextResponse } from 'next/server';
import Notification from '@/models/NotificationModel';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';
import { broadcastNotificationSchema } from '@/lib/validations/notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * POST /api/notifications/broadcast - Send notifications to multiple recipients
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const token = extractTokenFromHeader(request);
    if (!token) {
      return errorResponse('Authentication required', 401);
    }
    
    const user = verifyToken(token);
    if (!user) {
      return errorResponse('Invalid or expired token', 401);
    }

    // Only teachers and admins can broadcast notifications
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse('Only teachers and admins can broadcast notifications', 403);
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = broadcastNotificationSchema.parse(body);
    
    const {
      title,
      message,
      type,
      priority,
      recipients,
      deliveryChannels,
      scheduledFor,
      expiresAt,
      imageUrl,
      actions,
      category,
      tags
    } = validatedData;

    // Build recipient query
    let recipientUsers: any[] = [];
    const recipientFilters: any[] = [];

    // Direct user IDs
    if (recipients.userIds && recipients.userIds.length > 0) {
      recipientFilters.push({
        _id: { $in: recipients.userIds.map(id => new mongoose.Types.ObjectId(id)) }
      });
    }

    // Filter by roles
    if (recipients.roles && recipients.roles.length > 0) {
      recipientFilters.push({
        role: { $in: recipients.roles }
      });
    }

    // Filter by classes (requires class membership - this would need class model implementation)
    if (recipients.classIds && recipients.classIds.length > 0) {
      // For now, we'll skip class-based filtering as we don't have the Class model
      // In a full implementation, this would join with a Classes collection
      console.log('Class-based filtering not implemented yet:', recipients.classIds);
    }

    // Build final query
    let userQuery: any = {};
    if (recipientFilters.length > 0) {
      userQuery = recipientFilters.length === 1 ? recipientFilters[0] : { $or: recipientFilters };
    }

    // Exclude specific users
    if (recipients.excludeUserIds && recipients.excludeUserIds.length > 0) {
      userQuery._id = {
        ...userQuery._id,
        $nin: recipients.excludeUserIds.map(id => new mongoose.Types.ObjectId(id))
      };
    }

    // Fetch recipient users
    if (Object.keys(userQuery).length > 0) {
      recipientUsers = await User.find(userQuery).select('_id name email role');
    }

    if (recipientUsers.length === 0) {
      return errorResponse('No recipients found matching the criteria', 400);
    }

    // Limit broadcast size for safety
    if (recipientUsers.length > 1000) {
      return errorResponse('Broadcast cannot exceed 1000 recipients at once', 400);
    }

    // Generate campaign ID for tracking
    const campaignId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare notification data template
    const notificationTemplate = {
      title,
      message,
      type,
      priority,
      sender: new mongoose.Types.ObjectId(user.userId),
      deliveryChannels,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      imageUrl,
      actions,
      category,
      tags,
      campaignId
    };

    // Create notifications for each recipient
    const notificationPromises = recipientUsers.map(async (recipient) => {
      const notificationData = {
        ...notificationTemplate,
        recipient: recipient._id
      };

      return (Notification as any).createNotification(notificationData);
    });

    // Execute all notification creations
    const createdNotifications = await Promise.all(notificationPromises);

    // Prepare response with summary
    const summary = {
      campaignId,
      totalRecipients: recipientUsers.length,
      recipientBreakdown: recipientUsers.reduce((acc: any, user: any) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}),
      notification: {
        title,
        message,
        type,
        priority,
        scheduledFor,
        expiresAt
      },
      createdAt: new Date().toISOString(),
      createdBy: {
        id: user.userId,
        email: user.email
      }
    };

    // Log broadcast activity for admin monitoring
    console.log(`Broadcast notification sent by ${user.email}:`, {
      campaignId,
      recipients: recipientUsers.length,
      type,
      priority
    });

    return successResponse({
      summary,
      notifications: createdNotifications.slice(0, 10), // Return first 10 for verification
      totalCreated: createdNotifications.length
    }, `Broadcast notification sent to ${recipientUsers.length} recipients`, 201);

  } catch (error: any) {
    console.error('Error broadcasting notification:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.message);
    }
    
    if (error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400, error.message);
    }
    
    return errorResponse('Failed to broadcast notification', 500);
  }
}

/**
 * GET /api/notifications/broadcast - Get broadcast campaigns (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const token = extractTokenFromHeader(request);
    if (!token) {
      return errorResponse('Authentication required', 401);
    }
    
    const user = verifyToken(token);
    if (!user) {
      return errorResponse('Invalid or expired token', 401);
    }

    // Only admins can view broadcast campaigns
    if (user.role !== 'admin') {
      return errorResponse('Only admins can view broadcast campaigns', 403);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query for broadcast campaigns
    const matchQuery: any = {
      campaignId: { $exists: true, $ne: null }
    };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    // Aggregate broadcast campaigns
    const campaigns = await Notification.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$campaignId',
          firstNotification: { $first: '$$ROOT' },
          totalRecipients: { $sum: 1 },
          readCount: {
            $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
          },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          },
          createdAt: { $first: '$createdAt' },
          lastReadAt: { $max: '$readReceipt.readAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'firstNotification.sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      {
        $project: {
          campaignId: '$_id',
          title: '$firstNotification.title',
          message: '$firstNotification.message',
          type: '$firstNotification.type',
          priority: '$firstNotification.priority',
          category: '$firstNotification.category',
          totalRecipients: 1,
          readCount: 1,
          unreadCount: 1,
          readRate: {
            $multiply: [
              { $divide: ['$readCount', '$totalRecipients'] },
              100
            ]
          },
          createdAt: 1,
          lastReadAt: 1,
          sender: {
            $arrayElemAt: [
              {
                $map: {
                  input: '$sender',
                  as: 'user',
                  in: {
                    name: '$$user.name',
                    email: '$$user.email',
                    role: '$$user.role'
                  }
                }
              },
              0
            ]
          }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);

    // Get total count for pagination
    const totalCampaigns = await Notification.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$campaignId' } },
      { $count: 'total' }
    ]);

    const total = totalCampaigns[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return successResponse({
      campaigns,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }, 'Broadcast campaigns fetched successfully');

  } catch (error: any) {
    console.error('Error fetching broadcast campaigns:', error);
    return errorResponse('Failed to fetch broadcast campaigns', 500);
  }
}