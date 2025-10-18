import { NextRequest, NextResponse } from 'next/server';
import Notification from '@/models/NotificationModel';
import connectToDatabase from '@/lib/db';
import { notificationStatsQuerySchema } from '@/lib/validations/notification';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * GET /api/notifications/statistics - Get notification statistics and analytics
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
    const validatedQuery = notificationStatsQuerySchema.parse(queryParams);
    const { period, groupBy, includeReadReceipts } = validatedQuery;

    const recipientId = new mongoose.Types.ObjectId(user.userId);

    // Get comprehensive statistics
    const stats = await (Notification as any).getNotificationStats(recipientId);

    // Get detailed analytics for the specified period
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - period);

    const analyticsAggregation = [
      {
        $match: {
          recipient: recipientId,
          createdAt: { $gte: periodStart }
        }
      }
    ];

    // Group by specified time period
    let dateGrouping: any = {};
    switch (groupBy) {
      case 'day':
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'week':
        dateGrouping = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
    }

    // Detailed analytics aggregation
    const detailedAnalytics = await Notification.aggregate([
      ...analyticsAggregation,
      {
        $group: {
          _id: dateGrouping,
          total: { $sum: 1 },
          read: {
            $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
          },
          unread: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          },
          byType: {
            $push: {
              type: '$type',
              priority: '$priority',
              isRead: '$isRead'
            }
          },
          highPriority: {
            $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
          },
          criticalPriority: {
            $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
      }
    ]);

    // Process analytics data for better presentation
    const processedAnalytics = detailedAnalytics.map(item => {
      const typeBreakdown: any = {};
      item.byType.forEach((entry: any) => {
        if (!typeBreakdown[entry.type]) {
          typeBreakdown[entry.type] = { total: 0, read: 0, unread: 0 };
        }
        typeBreakdown[entry.type].total++;
        if (entry.isRead) {
          typeBreakdown[entry.type].read++;
        } else {
          typeBreakdown[entry.type].unread++;
        }
      });

      // Format date string based on grouping
      let dateStr = '';
      if (groupBy === 'day') {
        dateStr = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        dateStr = `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`;
      } else if (groupBy === 'month') {
        dateStr = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      }

      return {
        date: dateStr,
        period: item._id,
        total: item.total,
        read: item.read,
        unread: item.unread,
        readRate: item.total > 0 ? ((item.read / item.total) * 100).toFixed(2) : 0,
        highPriority: item.highPriority,
        criticalPriority: item.criticalPriority,
        typeBreakdown
      };
    });

    // Calculate engagement metrics
    const totalNotificationsInPeriod = await Notification.countDocuments({
      recipient: recipientId,
      createdAt: { $gte: periodStart }
    });

    const readNotificationsInPeriod = await Notification.countDocuments({
      recipient: recipientId,
      createdAt: { $gte: periodStart },
      isRead: true
    });

    const averageReadTime = await Notification.aggregate([
      {
        $match: {
          recipient: recipientId,
          isRead: true,
          'readReceipt.readAt': { $exists: true },
          createdAt: { $gte: periodStart }
        }
      },
      {
        $project: {
          readDelay: {
            $subtract: ['$readReceipt.readAt', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          averageReadDelay: { $avg: '$readDelay' },
          medianReadDelay: { $avg: '$readDelay' } // Simplified median
        }
      }
    ]);

    // Get read receipts data if requested
    let readReceiptData = null;
    if (includeReadReceipts) {
      readReceiptData = await Notification.aggregate([
        {
          $match: {
            recipient: recipientId,
            isRead: true,
            'readReceipt.readAt': { $exists: true },
            createdAt: { $gte: periodStart }
          }
        },
        {
          $group: {
            _id: {
              deviceType: '$readReceipt.deviceType',
              platform: '$readReceipt.platform'
            },
            count: { $sum: 1 }
          }
        }
      ]);
    }

    // Calculate priority distribution trends
    const priorityTrends = await Notification.aggregate([
      {
        $match: {
          recipient: recipientId,
          createdAt: { $gte: periodStart }
        }
      },
      {
        $group: {
          _id: {
            priority: '$priority',
            date: {
              $dateToString: {
                format: groupBy === 'day' ? '%Y-%m-%d' : 
                        groupBy === 'week' ? '%Y-W%U' : 
                        '%Y-%m',
                date: '$createdAt'
              }
            }
          },
          count: { $sum: 1 },
          readCount: {
            $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Engagement insights
    const engagementInsights = {
      totalNotifications: totalNotificationsInPeriod,
      readNotifications: readNotificationsInPeriod,
      readRate: totalNotificationsInPeriod > 0 ? 
        ((readNotificationsInPeriod / totalNotificationsInPeriod) * 100).toFixed(2) : 0,
      averageReadTime: averageReadTime.length > 0 ? 
        Math.round((averageReadTime[0].averageReadDelay || 0) / (1000 * 60)) : null, // Convert to minutes
      periodAnalysis: {
        period: `${period} days`,
        groupBy,
        dataPoints: processedAnalytics.length
      }
    };

    const comprehensiveStats = {
      overview: stats,
      period: {
        days: period,
        startDate: periodStart.toISOString(),
        endDate: new Date().toISOString(),
        groupBy
      },
      analytics: processedAnalytics,
      engagement: engagementInsights,
      priorityTrends: priorityTrends.reduce((acc: any, item: any) => {
        const date = item._id.date;
        if (!acc[date]) acc[date] = {};
        acc[date][item._id.priority] = {
          total: item.count,
          read: item.readCount,
          readRate: item.count > 0 ? ((item.readCount / item.count) * 100).toFixed(2) : 0
        };
        return acc;
      }, {}),
      ...(readReceiptData && { readReceipts: readReceiptData }),
      metadata: {
        generatedAt: new Date().toISOString(),
        userId: user.userId,
        queriedPeriod: period,
        includeReadReceipts
      }
    };

    return successResponse(comprehensiveStats, 'Notification statistics fetched successfully');

  } catch (error: any) {
    console.error('Error fetching notification statistics:', error);
    return errorResponse(
      error.name === 'ZodError' ? 'Invalid query parameters' : 'Failed to fetch notification statistics',
      500,
      error.name === 'ZodError' ? error.message : undefined
    );
  }
}