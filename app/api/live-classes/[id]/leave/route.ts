import { NextRequest, NextResponse } from 'next/server';
import LiveClassModel from '@/models/LiveClassModel';
import connectToDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

// POST /api/live-classes/[id]/leave - Leave live class
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    // Find participant
    const participantIndex = liveClass.participants.findIndex(
      (p: any) => p.userId.toString() === user._id.toString()
    );

    if (participantIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'You are not in this live class'
      }, { status: 400 });
    }

    // Update participant status
    liveClass.participants[participantIndex].isActive = false;
    liveClass.participants[participantIndex].leftAt = new Date();

    // Calculate session duration
    const joinedAt = liveClass.participants[participantIndex].joinedAt;
    const leftAt = liveClass.participants[participantIndex].leftAt;
    const duration = Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000); // in seconds

    liveClass.participants[participantIndex].sessionDuration = duration;

    await liveClass.save();

    return NextResponse.json({
      success: true,
      message: 'Successfully left the live class',
      data: {
        sessionDuration: duration
      }
    });

  } catch (error) {
    console.error('Error leaving live class:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to leave live class'
    }, { status: 500 });
  }
}