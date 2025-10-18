import { NextRequest, NextResponse } from 'next/server';
import LiveClassModel, { LiveClassStatus, ParticipantRole } from '@/models/LiveClassModel';
import connectToDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

// POST /api/live-classes/[id]/join - Join live class
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

    // Check if class is available to join
    if (liveClass.status !== LiveClassStatus.LIVE) {
      return NextResponse.json({
        success: false,
        message: 'Live class is not currently active'
      }, { status: 400 });
    }

    // Check access permissions
    const hasAccess = 
      liveClass.isPublic ||
      liveClass.teacher.toString() === user._id.toString() ||
      liveClass.allowedUsers.includes(user._id.toString()) ||
      (user.classIds && liveClass.classId && user.classIds.includes(liveClass.classId));

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        message: 'You do not have permission to join this class'
      }, { status: 403 });
    }

    // Check if already in the class
    const existingParticipant = liveClass.participants.find(
      (p: any) => p.userId.toString() === user._id.toString()
    );

    if (existingParticipant) {
      return NextResponse.json({
        success: false,
        message: 'You are already in this live class'
      }, { status: 400 });
    }

    // Check capacity
    if (liveClass.maxParticipants && liveClass.participants.length >= liveClass.maxParticipants) {
      return NextResponse.json({
        success: false,
        message: 'Live class is at maximum capacity'
      }, { status: 400 });
    }

    // Determine role
    let role = ParticipantRole.STUDENT;
    if (liveClass.teacher.toString() === user._id.toString()) {
      role = ParticipantRole.TEACHER;
    } else if (user.role === 'admin') {
      role = ParticipantRole.MODERATOR;
    }

    // Add participant
    liveClass.participants.push({
      userId: user._id,
      role,
      joinedAt: new Date(),
      isActive: true,
      permissions: {
        canSpeak: true,
        canVideo: true,
        canChat: true,
        canScreenShare: role !== ParticipantRole.STUDENT
      }
    });

    await liveClass.save();

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the live class',
      data: {
        meetingUrl: liveClass.meetingUrl,
        meetingId: liveClass.meetingId,
        meetingPassword: liveClass.meetingPassword,
        platform: liveClass.platform,
        role: role,
        permissions: {
          canSpeak: true,
          canVideo: true,
          canChat: true,
          canScreenShare: role !== ParticipantRole.STUDENT
        }
      }
    });

  } catch (error) {
    console.error('Error joining live class:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to join live class'
    }, { status: 500 });
  }
}