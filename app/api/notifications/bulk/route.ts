import { NextRequest, NextResponse } from 'next/server';
import Notification from '@/models/NotificationModel';
import connectToDatabase from '@/lib/db';
import { bulkCreateNotificationsSchema } from '@/lib/validations/notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * POST /api/notifications/bulk - Bulk create notifications
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

    // Only teachers and admins can bulk create notifications
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse('Only teachers and admins can bulk create notifications', 403);
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = bulkCreateNotificationsSchema.parse(body);
    const { notifications, campaignId } = validatedData;

    const bulkResults = {
      total: notifications.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ index: number; error: string; data: any }>
    };

    const createdNotifications = [];
    const finalCampaignId = campaignId || `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Process each notification
    for (let i = 0; i < notifications.length; i++) {
      try {
        const notificationData = notifications[i];

        // Set sender if not provided
        if (!notificationData.sender) {
          notificationData.sender = user.userId;
        }

        // Add campaign ID for tracking
        const processedData = {
          ...notificationData,
          campaignId: finalCampaignId,
          sender: new mongoose.Types.ObjectId(notificationData.sender),
          recipient: new mongoose.Types.ObjectId(notificationData.recipient),
          expiresAt: notificationData.expiresAt ? new Date(notificationData.expiresAt) : undefined,
          scheduledFor: notificationData.scheduledFor ? new Date(notificationData.scheduledFor) : undefined
        };

        // Validate recipient exists (basic check)
        if (!mongoose.Types.ObjectId.isValid(processedData.recipient)) {
          throw new Error('Invalid recipient ID');
        }

        // Create notification
        const notification = await (Notification as any).createNotification(processedData);
        
        createdNotifications.push({
          id: notification._id,
          recipient: notification.recipient,
          title: notification.title,
          originalIndex: i
        });

        bulkResults.successful++;

      } catch (error: any) {
        bulkResults.failed++;
        bulkResults.errors.push({
          index: i,
          error: error.message || 'Unknown error occurred',
          data: notifications[i]
        });
      }
    }

    const responseData = {
      results: bulkResults,
      campaignId: finalCampaignId,
      createdNotifications: createdNotifications.slice(0, 20), // Limit response size
      summary: {
        total: bulkResults.total,
        successful: bulkResults.successful,
        failed: bulkResults.failed,
        successRate: ((bulkResults.successful / bulkResults.total) * 100).toFixed(2) + '%'
      }
    };

    const statusCode = bulkResults.failed > 0 ? 207 : 201; // 207 Multi-Status for partial success
    const message = bulkResults.failed > 0 
      ? `Bulk operation completed with ${bulkResults.failed} failures`
      : 'All notifications created successfully';

    return successResponse(responseData, message, statusCode);

  } catch (error: any) {
    console.error('Error in bulk notification creation:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.message);
    }
    
    return errorResponse('Failed to process bulk notification creation', 500);
  }
}

/**
 * DELETE /api/notifications/bulk - Bulk delete notifications
 */
export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { 
      notificationIds,
      campaignId,
      filters = {},
      confirmDeletion = false
    } = body;

    if (!confirmDeletion) {
      return errorResponse('Confirmation required for bulk deletion. Set confirmDeletion to true.', 400);
    }

    let deleteQuery: any = {};

    // Build delete query
    if (notificationIds && Array.isArray(notificationIds)) {
      // Delete specific notifications
      if (notificationIds.length === 0) {
        return errorResponse('No notification IDs provided', 400);
      }

      // Validate all IDs
      const validIds = notificationIds.every((id: string) => 
        mongoose.Types.ObjectId.isValid(id)
      );

      if (!validIds) {
        return errorResponse('Invalid notification ID format', 400);
      }

      deleteQuery._id = { 
        $in: notificationIds.map((id: string) => new mongoose.Types.ObjectId(id)) 
      };
    } else if (campaignId) {
      // Delete all notifications from a campaign
      deleteQuery.campaignId = campaignId;
    } else if (Object.keys(filters).length > 0) {
      // Delete based on filters
      if (filters.type) deleteQuery.type = filters.type;
      if (filters.category) deleteQuery.category = filters.category;
      if (filters.priority) deleteQuery.priority = filters.priority;
      if (filters.isRead !== undefined) deleteQuery.isRead = filters.isRead;
      
      if (filters.dateFrom || filters.dateTo) {
        deleteQuery.createdAt = {};
        if (filters.dateFrom) deleteQuery.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) deleteQuery.createdAt.$lte = new Date(filters.dateTo);
      }
    } else {
      return errorResponse('Must provide notificationIds, campaignId, or filters for bulk deletion', 400);
    }

    // Permission check - users can only delete their own notifications or sent by them
    if (user.role !== 'admin') {
      deleteQuery.$or = [
        { recipient: new mongoose.Types.ObjectId(user.userId) },
        { sender: new mongoose.Types.ObjectId(user.userId) }
      ];
    }

    // Get notifications to be deleted for confirmation
    const notificationsToDelete = await Notification.find(deleteQuery).select('_id title type recipient sender');

    if (notificationsToDelete.length === 0) {
      return errorResponse('No notifications found matching the criteria', 404);
    }

    // Limit bulk deletion for safety
    if (notificationsToDelete.length > 500) {
      return errorResponse('Cannot delete more than 500 notifications at once', 400);
    }

    // Perform deletion
    const deleteResult = await Notification.deleteMany(deleteQuery);

    const deletionSummary = {
      requestedDeletion: {
        notificationIds: notificationIds?.length || 0,
        campaignId,
        filters
      },
      deleted: deleteResult.deletedCount,
      confirmations: notificationsToDelete.map(n => ({
        id: n._id,
        title: n.title,
        type: n.type,
        recipient: n.recipient,
        sender: n.sender
      }))
    };

    return successResponse(deletionSummary, `Successfully deleted ${deleteResult.deletedCount} notifications`);

  } catch (error: any) {
    console.error('Error in bulk notification deletion:', error);
    return errorResponse('Failed to process bulk notification deletion', 500);
  }
}

/**
 * PUT /api/notifications/bulk - Bulk update notifications
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { 
      notificationIds,
      campaignId,
      updateData,
      filters = {}
    } = body;

    if (!updateData || Object.keys(updateData).length === 0) {
      return errorResponse('Update data is required', 400);
    }

    let updateQuery: any = {};

    // Build update query
    if (notificationIds && Array.isArray(notificationIds)) {
      if (notificationIds.length === 0) {
        return errorResponse('No notification IDs provided', 400);
      }

      const validIds = notificationIds.every((id: string) => 
        mongoose.Types.ObjectId.isValid(id)
      );

      if (!validIds) {
        return errorResponse('Invalid notification ID format', 400);
      }

      updateQuery._id = { 
        $in: notificationIds.map((id: string) => new mongoose.Types.ObjectId(id)) 
      };
    } else if (campaignId) {
      updateQuery.campaignId = campaignId;
    } else if (Object.keys(filters).length > 0) {
      if (filters.type) updateQuery.type = filters.type;
      if (filters.category) updateQuery.category = filters.category;
      if (filters.priority) updateQuery.priority = filters.priority;
      if (filters.isRead !== undefined) updateQuery.isRead = filters.isRead;
      
      if (filters.dateFrom || filters.dateTo) {
        updateQuery.createdAt = {};
        if (filters.dateFrom) updateQuery.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) updateQuery.createdAt.$lte = new Date(filters.dateTo);
      }
    } else {
      return errorResponse('Must provide notificationIds, campaignId, or filters for bulk update', 400);
    }

    // Permission check - only sender or admin can update
    if (user.role !== 'admin') {
      updateQuery.sender = new mongoose.Types.ObjectId(user.userId);
    }

    // Validate and prepare update data
    const allowedUpdates = ['title', 'message', 'priority', 'category', 'tags', 'expiresAt'];
    const sanitizedUpdateData: any = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedUpdates.includes(key)) {
        if (key === 'expiresAt' && value) {
          sanitizedUpdateData[key] = new Date(value as string);
        } else {
          sanitizedUpdateData[key] = value;
        }
      }
    }

    if (Object.keys(sanitizedUpdateData).length === 0) {
      return errorResponse('No valid update fields provided', 400);
    }

    // Get notifications to be updated
    const notificationsToUpdate = await Notification.find(updateQuery).select('_id title type');

    if (notificationsToUpdate.length === 0) {
      return errorResponse('No notifications found matching the criteria', 404);
    }

    // Limit bulk updates for safety
    if (notificationsToUpdate.length > 500) {
      return errorResponse('Cannot update more than 500 notifications at once', 400);
    }

    // Perform update
    const updateResult = await Notification.updateMany(updateQuery, {
      $set: sanitizedUpdateData
    });

    const updateSummary = {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount,
      updateData: sanitizedUpdateData,
      affectedNotifications: notificationsToUpdate.map(n => ({
        id: n._id,
        title: n.title,
        type: n.type
      }))
    };

    return successResponse(updateSummary, `Successfully updated ${updateResult.modifiedCount} notifications`);

  } catch (error: any) {
    console.error('Error in bulk notification update:', error);
    return errorResponse('Failed to process bulk notification update', 500);
  }
}