import { NextRequest, NextResponse } from 'next/server';
import LiveClassModel from '@/models/LiveClassModel';
import connectToDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

// GET /api/live-classes/[id]/recordings - Get recordings
export async function GET(
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

    const liveClass = await LiveClassModel.findById(id).populate('teacher', 'name email avatar');

    if (!liveClass) {
      return NextResponse.json({
        success: false,
        message: 'Live class not found'
      }, { status: 404 });
    }

    // Check access to recordings
    const hasAccess = 
      liveClass.teacher._id.toString() === user._id.toString() ||
      user.role === 'admin' ||
      liveClass.participants.some((p: any) => p.userId.toString() === user._id.toString());

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        message: 'Access denied to recordings'
      }, { status: 403 });
    }

    // Filter recordings based on permissions
    const accessibleRecordings = liveClass.recordings.filter((recording: any) => {
      return recording.isPublic || 
             recording.accessAllowedTo.includes(user._id.toString()) ||
             liveClass.teacher._id.toString() === user._id.toString() ||
             user.role === 'admin';
    });

    return NextResponse.json({
      success: true,
      message: 'Recordings fetched successfully',
      data: {
        recordings: accessibleRecordings,
        classInfo: {
          title: liveClass.title,
          teacher: liveClass.teacher,
          scheduledStartTime: liveClass.scheduledStartTime
        }
      }
    });

  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch recordings'
    }, { status: 500 });
  }
}

// POST /api/live-classes/[id]/recordings - Add recording
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

    // Check permissions - only teacher or admin can add recordings
    const canAddRecording = 
      liveClass.teacher.toString() === user._id.toString() ||
      user.role === 'admin';

    if (!canAddRecording) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient permissions to add recordings'
      }, { status: 403 });
    }

    const { title, url, type = 'video', isPublic = false, accessAllowedTo = [] } = await request.json();

    if (!title || !url) {
      return NextResponse.json({
        success: false,
        message: 'Title and URL are required'
      }, { status: 400 });
    }

    const recording = {
      title,
      url,
      type,
      duration: 0, // Will be updated when processing is complete
      size: 0, // Will be updated when processing is complete
      isPublic,
      accessAllowedTo,
      uploadedAt: new Date(),
      uploadedBy: user._id
    };

    liveClass.recordings.push(recording);
    await liveClass.save();

    return NextResponse.json({
      success: true,
      message: 'Recording added successfully',
      data: recording
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding recording:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to add recording'
    }, { status: 500 });
  }
}