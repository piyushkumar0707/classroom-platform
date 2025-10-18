import { NextRequest, NextResponse } from 'next/server';
import LiveClassModel, { LiveClassStatus } from '@/models/LiveClassModel';
import connectToDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

// POST /api/live-classes/[id]/control - Start/End live class
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { action } = await request.json(); // 'start' or 'end'

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

    const liveClass = await LiveClassModel.findById(id);

    if (!liveClass) {
      return NextResponse.json({
        success: false,
        message: 'Live class not found'
      }, { status: 404 });
    }

    // Check permissions - only teacher or admin can control
    const canControl = 
      liveClass.teacher.toString() === user._id.toString() ||
      user.role === 'admin';

    if (!canControl) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient permissions to control this live class'
      }, { status: 403 });
    }

    if (action === 'start') {
      if (liveClass.status === LiveClassStatus.LIVE) {
        return NextResponse.json({
          success: false,
          message: 'Live class is already active'
        }, { status: 400 });
      }

      if (liveClass.status === LiveClassStatus.ENDED) {
        return NextResponse.json({
          success: false,
          message: 'Cannot restart an ended live class'
        }, { status: 400 });
      }

      liveClass.status = LiveClassStatus.LIVE;
      liveClass.actualStartTime = new Date();

      await liveClass.save();

      return NextResponse.json({
        success: true,
        message: 'Live class started successfully',
        data: {
          status: liveClass.status,
          actualStartTime: liveClass.actualStartTime,
          meetingUrl: liveClass.meetingUrl,
          meetingId: liveClass.meetingId
        }
      });

    } else if (action === 'end') {
      if (liveClass.status !== LiveClassStatus.LIVE) {
        return NextResponse.json({
          success: false,
          message: 'Live class is not currently active'
        }, { status: 400 });
      }

      liveClass.status = LiveClassStatus.ENDED;
      liveClass.actualEndTime = new Date();

      // Mark all active participants as inactive
      liveClass.participants.forEach((participant: any) => {
        if (participant.isActive) {
          participant.isActive = false;
          participant.leftAt = new Date();
          if (participant.joinedAt) {
            const duration = Math.floor(
              (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000
            );
            participant.sessionDuration = duration;
          }
        }
      });

      // Calculate total duration
      if (liveClass.actualStartTime) {
        const totalDuration = Math.floor(
          (liveClass.actualEndTime.getTime() - liveClass.actualStartTime.getTime()) / 1000
        );
        liveClass.duration = totalDuration;
      }

      await liveClass.save();

      return NextResponse.json({
        success: true,
        message: 'Live class ended successfully',
        data: {
          status: liveClass.status,
          actualEndTime: liveClass.actualEndTime,
          duration: liveClass.duration,
          totalParticipants: liveClass.participants.length
        }
      });

    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid action. Use "start" or "end"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error controlling live class:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to control live class'
    }, { status: 500 });
  }
}