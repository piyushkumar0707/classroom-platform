import { NextRequest, NextResponse } from 'next/server';
import LiveClassModel from '@/models/LiveClassModel';
import connectToDatabase from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

// GET /api/live-classes/[id] - Get specific live class
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get token from cookies or Authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Verify the token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired token'
      }, { status: 401 });
    }

    // Connect to database and get user
    await connectToDatabase();
    const user = await User.findById(payload.userId).select('-password');
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Find the live class
    const liveClass = await LiveClassModel.findById(id)
      .populate('teacher', 'name email avatar')
      .populate('participants.userId', 'name email avatar');

    if (!liveClass) {
      return NextResponse.json({
        success: false,
        message: 'Live class not found'
      }, { status: 404 });
    }

    // Check access permissions
    const hasAccess = 
      liveClass.isPublic ||
      liveClass.teacher._id.toString() === user._id.toString() ||
      user.role === 'admin' ||
      liveClass.participants.some((p: any) => p.userId._id.toString() === user._id.toString()) ||
      liveClass.allowedUsers.includes(user._id.toString());

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        message: 'Access denied to this live class'
      }, { status: 403 });
    }

    // Filter sensitive data for students
    if (user.role === 'student' && liveClass.teacher._id.toString() !== user._id.toString()) {
      delete liveClass.meetingPassword;
      delete liveClass.platformSettings;
    }

    return NextResponse.json({
      success: true,
      message: 'Live class fetched successfully',
      data: liveClass
    });

  } catch (error) {
    console.error('Error fetching live class:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch live class'
    }, { status: 500 });
  }
}

// PATCH /api/live-classes/[id] - Update live class
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get token from cookies or Authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Verify the token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired token'
      }, { status: 401 });
    }

    // Connect to database and get user
    await connectToDatabase();
    const user = await User.findById(payload.userId).select('-password');
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Find the live class
    const liveClass = await LiveClassModel.findById(id);

    if (!liveClass) {
      return NextResponse.json({
        success: false,
        message: 'Live class not found'
      }, { status: 404 });
    }

    // Check permissions
    const canEdit = 
      liveClass.teacher.toString() === user._id.toString() ||
      user.role === 'admin';

    if (!canEdit) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient permissions to update this live class'
      }, { status: 403 });
    }

    const updateData = await request.json();
    
    // Update the live class
    const updatedClass = await LiveClassModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('teacher', 'name email avatar');

    return NextResponse.json({
      success: true,
      message: 'Live class updated successfully',
      data: updatedClass
    });

  } catch (error) {
    console.error('Error updating live class:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update live class'
    }, { status: 500 });
  }
}

// DELETE /api/live-classes/[id] - Delete live class
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get token from cookies or Authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Verify the token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired token'
      }, { status: 401 });
    }

    // Connect to database and get user
    await connectToDatabase();
    const user = await User.findById(payload.userId).select('-password');
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Find the live class
    const liveClass = await LiveClassModel.findById(id);

    if (!liveClass) {
      return NextResponse.json({
        success: false,
        message: 'Live class not found'
      }, { status: 404 });
    }

    // Check permissions
    const canDelete = 
      liveClass.teacher.toString() === user._id.toString() ||
      user.role === 'admin';

    if (!canDelete) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient permissions to delete this live class'
      }, { status: 403 });
    }

    // Delete the live class
    await LiveClassModel.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Live class deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting live class:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete live class'
    }, { status: 500 });
  }
}