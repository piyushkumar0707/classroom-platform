import { NextRequest, NextResponse } from 'next/server';
import LiveClassModel, { LiveClassStatus } from '@/models/LiveClassModel';
import connectToDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

// GET /api/live-classes/analytics - Get live classes analytics
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired token'
      }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(payload.userId).select('-password');
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30'; // days
    const teacherId = url.searchParams.get('teacherId') || '';

    // Build query based on user role and filters
    const query: any = {};
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(period));

    query.createdAt = { $gte: dateFilter };

    if (user.role === 'teacher' && !teacherId) {
      query.teacher = user._id;
    } else if (teacherId && (user.role === 'admin' || user._id.toString() === teacherId)) {
      query.teacher = teacherId;
    } else if (user.role === 'student') {
      return NextResponse.json({
        success: false,
        message: 'Insufficient permissions to access analytics'
      }, { status: 403 });
    }

    // Get basic statistics
    const [
      totalClasses,
      completedClasses,
      liveClasses,
      scheduledClasses,
      cancelledClasses
    ] = await Promise.all([
      LiveClassModel.countDocuments(query),
      LiveClassModel.countDocuments({ ...query, status: LiveClassStatus.ENDED }),
      LiveClassModel.countDocuments({ ...query, status: LiveClassStatus.LIVE }),
      LiveClassModel.countDocuments({ ...query, status: LiveClassStatus.SCHEDULED }),
      LiveClassModel.countDocuments({ ...query, status: LiveClassStatus.CANCELLED })
    ]);

    // Get participation statistics
    const classesWithParticipants = await LiveClassModel.find({
      ...query,
      status: LiveClassStatus.ENDED
    }).select('participants duration actualStartTime actualEndTime');

    let totalParticipants = 0;
    let totalDuration = 0;
    let totalSessions = 0;
    let averageParticipantsPerClass = 0;
    let averageSessionDuration = 0;

    classesWithParticipants.forEach((liveClass: any) => {
      const classParticipants = liveClass.participants.length;
      totalParticipants += classParticipants;
      
      if (liveClass.duration) {
        totalDuration += liveClass.duration;
      }

      liveClass.participants.forEach((participant: any) => {
        if (participant.sessionDuration) {
          totalSessions++;
          averageSessionDuration += participant.sessionDuration;
        }
      });
    });

    if (completedClasses > 0) {
      averageParticipantsPerClass = Math.round(totalParticipants / completedClasses);
    }

    if (totalSessions > 0) {
      averageSessionDuration = Math.round(averageSessionDuration / totalSessions);
    }

    // Get platform usage statistics
    const platformStats = await LiveClassModel.aggregate([
      { $match: query },
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get class type statistics
    const typeStats = await LiveClassModel.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get daily statistics for the period
    const dailyStats = await LiveClassModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduledStartTime' } },
          scheduled: {
            $sum: {
              $cond: [{ $eq: ['$status', LiveClassStatus.SCHEDULED] }, 1, 0]
            }
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', LiveClassStatus.ENDED] }, 1, 0]
            }
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ['$status', LiveClassStatus.CANCELLED] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const analytics = {
      overview: {
        totalClasses,
        completedClasses,
        liveClasses,
        scheduledClasses,
        cancelledClasses,
        completionRate: totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0
      },
      participation: {
        totalParticipants,
        averageParticipantsPerClass,
        totalSessions,
        averageSessionDuration: Math.floor(averageSessionDuration / 60), // in minutes
        totalDuration: Math.floor(totalDuration / 3600) // in hours
      },
      platforms: platformStats,
      classTypes: typeStats,
      dailyTrends: dailyStats,
      period: {
        days: parseInt(period),
        startDate: dateFilter.toISOString(),
        endDate: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Analytics fetched successfully',
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch analytics'
    }, { status: 500 });
  }
}