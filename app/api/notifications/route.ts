import { NextRequest, NextResponse } from 'next/server';
import Notification from '@/models/NotificationModel';
import connectToDatabase from '@/lib/db';
import { notificationQuerySchema, createNotificationSchema } from '@/lib/validations/notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * GET /api/notifications - Get user's notifications with filtering and pagination
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

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedQuery = notificationQuerySchema.parse(queryParams);
    const {
      page,
      limit,
      type,
      priority,
      isRead,
      category,
      search,
      sortBy,
      sortOrder,
      includeExpired,
      tags,
      dateFrom,
      dateTo,
      campaignId
    } = validatedQuery;

    // Build query options
    const queryOptions: any = {
      page,
      limit,
      type,
      priority,
      category,
      search,
      sortBy,
      sortOrder,
      includeExpired
    };

    // Handle read status filter
    if (isRead !== undefined) {
      queryOptions.isRead = isRead;
    }

    // Add additional filters
    const recipientId = new mongoose.Types.ObjectId(user.userId);
    
    // Get notifications with pagination
    const result = await (Notification as any).getNotificationsPaginated(recipientId, queryOptions);

    // Apply additional client-side filters if needed
    let { notifications } = result;

    // Filter by tags
    if (tags && tags.length > 0) {
      notifications = notifications.filter((notification: any) => 
        notification.tags?.some((tag: string) => tags.includes(tag))
      );
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      notifications = notifications.filter((notification: any) => {
        const createdAt = new Date(notification.createdAt);
        if (dateFrom && createdAt < new Date(dateFrom)) return false;
        if (dateTo && createdAt > new Date(dateTo)) return false;
        return true;
      });
    }

    // Filter by campaign ID
    if (campaignId) {
      notifications = notifications.filter((notification: any) => 
        notification.campaignId === campaignId
      );
    }

    // Recalculate pagination if client-side filtering was applied
    const totalAfterFiltering = notifications.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    if (tags?.length || dateFrom || dateTo || campaignId) {
      notifications = notifications.slice(startIndex, endIndex);
      result.pagination = {
        currentPage: page,
        totalPages: Math.ceil(totalAfterFiltering / limit),
        totalItems: totalAfterFiltering,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(totalAfterFiltering / limit),
        hasPrevPage: page > 1
      };
    }

    return successResponse({
      notifications,
      pagination: result.pagination,
      filters: {
        type,
        priority,
        isRead,
        category,
        tags,
        dateFrom,
        dateTo,
        campaignId
      }
    }, 'Notifications fetched successfully');

  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return errorResponse(
      error.name === 'ZodError' ? 'Invalid query parameters' : 'Failed to fetch notifications',
      500,
      error.name === 'ZodError' ? error.message : undefined
    );
  }
}

/**
 * POST /api/notifications - Create a new notification
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

    // Only teachers and admins can create notifications for other users
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse('Only teachers and admins can create notifications', 403);
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = createNotificationSchema.parse(body);

    // Check if recipient exists (basic validation)
    if (!mongoose.Types.ObjectId.isValid(validatedData.recipient)) {
      return errorResponse('Invalid recipient ID', 400);
    }

    // Set sender if not provided
    if (!validatedData.sender) {
      validatedData.sender = user.userId;
    }

    // Prepare notification data
    const notificationData = {
      ...validatedData,
      recipient: new mongoose.Types.ObjectId(validatedData.recipient),
      sender: new mongoose.Types.ObjectId(validatedData.sender),
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
      scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined
    };

    // Create notification
    const notification = await (Notification as any).createNotification(notificationData);

    // Populate related fields for response
    await notification.populate([
      { path: 'sender', select: 'name email avatar role' },
      { path: 'recipient', select: 'name email avatar role' }
    ]);

    return successResponse(notification, 'Notification created successfully', 201);

  } catch (error: any) {
    console.error('Error creating notification:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.message);
    }
    
    if (error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400, error.message);
    }
    
    return errorResponse('Failed to create notification', 500);
  }
}