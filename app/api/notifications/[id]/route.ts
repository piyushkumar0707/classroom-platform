import { NextRequest, NextResponse } from 'next/server';
import Notification from '@/models/NotificationModel';
import connectToDatabase from '@/lib/db';
import { updateNotificationSchema } from '@/lib/validations/notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * GET /api/notifications/[id] - Get a specific notification by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid notification ID', 400);
    }

    // Find notification
    const notification = await Notification.findById(id)
      .populate('sender', 'name email avatar role')
      .populate('recipient', 'name email avatar role')
      .populate('metadata.assignmentId', 'title dueDate')
      .populate('metadata.classId', 'name code');

    if (!notification) {
      return errorResponse('Notification not found', 404);
    }

    // Check permissions - user can only access their own notifications or created by them
    const canAccess = 
      notification.recipient._id.toString() === user.userId || 
      notification.sender?._id.toString() === user.userId ||
      user.role === 'admin';

    if (!canAccess) {
      return errorResponse('You do not have permission to access this notification', 403);
    }

    return successResponse(notification, 'Notification fetched successfully');

  } catch (error: any) {
    console.error('Error fetching notification:', error);
    return errorResponse('Failed to fetch notification', 500);
  }
}

/**
 * PUT /api/notifications/[id] - Update a notification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid notification ID', 400);
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = updateNotificationSchema.parse(body);

    // Find notification
    const notification = await Notification.findById(id);
    if (!notification) {
      return errorResponse('Notification not found', 404);
    }

    // Check permissions - only sender, admin, or system can update notifications
    const canUpdate = 
      notification.sender?.toString() === user.userId ||
      user.role === 'admin';

    if (!canUpdate) {
      return errorResponse('You do not have permission to update this notification', 403);
    }

    // Prevent updating read status through this endpoint (use dedicated endpoint)
    const updateData = { ...validatedData };
    delete (updateData as any).isRead;

    // Update notification
    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      {
        ...updateData,
        ...(validatedData.expiresAt && { expiresAt: new Date(validatedData.expiresAt) }),
        ...(validatedData.scheduledFor && { scheduledFor: new Date(validatedData.scheduledFor) })
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'sender', select: 'name email avatar role' },
      { path: 'recipient', select: 'name email avatar role' },
      { path: 'metadata.assignmentId', select: 'title dueDate' },
      { path: 'metadata.classId', select: 'name code' }
    ]);

    return successResponse(updatedNotification, 'Notification updated successfully');

  } catch (error: any) {
    console.error('Error updating notification:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.message);
    }
    
    if (error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400, error.message);
    }
    
    return errorResponse('Failed to update notification', 500);
  }
}

/**
 * DELETE /api/notifications/[id] - Delete a notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid notification ID', 400);
    }

    // Find notification
    const notification = await Notification.findById(id);
    if (!notification) {
      return errorResponse('Notification not found', 404);
    }

    // Check permissions
    const canDelete = 
      notification.sender?.toString() === user.userId ||
      notification.recipient.toString() === user.userId ||
      user.role === 'admin';

    if (!canDelete) {
      return errorResponse('You do not have permission to delete this notification', 403);
    }

    // Delete notification
    await Notification.findByIdAndDelete(id);

    return successResponse({}, 'Notification deleted successfully');

  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return errorResponse('Failed to delete notification', 500);
  }
}