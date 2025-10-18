import { NextRequest, NextResponse } from 'next/server';
import Notification from '@/models/NotificationModel';
import connectToDatabase from '@/lib/db';
import { markAsReadSchema } from '@/lib/validations/notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * PUT /api/notifications/mark-read - Mark notifications as read
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
    
    // Validate request body
    const validatedData = markAsReadSchema.parse(body);
    const { notificationIds, deviceInfo } = validatedData;

    const recipientId = new mongoose.Types.ObjectId(user.userId);

    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      const objectIds = notificationIds.map(id => new mongoose.Types.ObjectId(id));
      
      // Verify all notifications belong to the user
      const notifications = await Notification.find({
        _id: { $in: objectIds },
        recipient: recipientId
      });

      if (notifications.length !== notificationIds.length) {
        return errorResponse('Some notifications not found or do not belong to you', 404);
      }

      // Mark as read with device info
      const updatePromises = notifications.map(async (notification) => {
        if (!notification.isRead) {
          return notification.markAsRead(deviceInfo);
        }
        return notification;
      });

      const updatedNotifications = await Promise.all(updatePromises);
      const markedCount = updatedNotifications.filter(n => n.isRead).length;

      return successResponse({
        markedCount,
        notifications: updatedNotifications
      }, `${markedCount} notifications marked as read`);

    } else {
      // Mark all unread notifications as read
      const result = await (Notification as any).markMultipleAsRead(recipientId);
      
      return successResponse({
        markedCount: result.modifiedCount
      }, `${result.modifiedCount} notifications marked as read`);
    }

  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.message);
    }
    
    return errorResponse('Failed to mark notifications as read', 500);
  }
}

/**
 * DELETE /api/notifications/mark-read - Mark notifications as unread
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
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return errorResponse('Notification IDs are required', 400);
    }

    // Validate notification IDs
    const validIds = notificationIds.every((id: string) => 
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validIds) {
      return errorResponse('Invalid notification ID format', 400);
    }

    const recipientId = new mongoose.Types.ObjectId(user.userId);
    const objectIds = notificationIds.map((id: string) => new mongoose.Types.ObjectId(id));

    // Find and verify notifications belong to user
    const notifications = await Notification.find({
      _id: { $in: objectIds },
      recipient: recipientId
    });

    if (notifications.length !== notificationIds.length) {
      return errorResponse('Some notifications not found or do not belong to you', 404);
    }

    // Mark as unread
    const updatePromises = notifications.map(async (notification) => {
      if (notification.isRead) {
        return notification.markAsUnread();
      }
      return notification;
    });

    const updatedNotifications = await Promise.all(updatePromises);
    const unmarkedCount = updatedNotifications.filter(n => !n.isRead).length;

    return successResponse({
      unmarkedCount,
      notifications: updatedNotifications
    }, `${unmarkedCount} notifications marked as unread`);

  } catch (error: any) {
    console.error('Error marking notifications as unread:', error);
    return errorResponse('Failed to mark notifications as unread', 500);
  }
}