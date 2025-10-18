import { NextRequest, NextResponse } from 'next/server';
import Doubt from '@/models/DoubtModel';
import connectToDatabase from '@/lib/db';
import { updateDoubtSchema, createDoubtResponseSchema, voteDoubtSchema } from '@/lib/validations/doubt';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * GET /api/doubts/[id] - Get a specific doubt by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid doubt ID', 400);
    }

    // Find doubt and increment view count
    const doubt = await Doubt.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .populate('askedBy', 'name email role avatar')
      .populate('assignedTo', 'name email role avatar')
      .populate('resolvedBy', 'name email role avatar')
      .populate('responses.respondedBy', 'name email role avatar')
      .lean();

    if (!doubt) {
      return errorResponse('Doubt not found', 404);
    }

    return successResponse(doubt, 'Doubt fetched successfully');

  } catch (error: any) {
    console.error('Error fetching doubt:', error);
    return errorResponse('Failed to fetch doubt', 500);
  }
}

/**
 * PUT /api/doubts/[id] - Update a doubt
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    // Verify authentication
    const user = await verifyToken(request);
    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid doubt ID', 400);
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = updateDoubtSchema.parse(body);

    // Find the existing doubt
    const existingDoubt = await Doubt.findById(id);
    if (!existingDoubt) {
      return errorResponse('Doubt not found', 404);
    }

    // Check permissions - only the author or assigned teacher can update
    const canUpdate = 
      existingDoubt.askedBy.toString() === user.userId ||
      (existingDoubt.assignedTo && existingDoubt.assignedTo.toString() === user.userId) ||
      user.role === 'admin';

    if (!canUpdate) {
      return errorResponse('You do not have permission to update this doubt', 403);
    }

    // Update doubt
    const updatedDoubt = await Doubt.findByIdAndUpdate(
      id,
      { ...validatedData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('askedBy', 'name email role avatar')
      .populate('assignedTo', 'name email role avatar')
      .populate('resolvedBy', 'name email role avatar');

    return successResponse('Doubt updated successfully', updatedDoubt);

  } catch (error: any) {
    console.error('Error updating doubt:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.errors);
    }
    
    if (error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400, error.errors);
    }
    
    return errorResponse('Failed to update doubt', 500);
  }
}

/**
 * DELETE /api/doubts/[id] - Delete a doubt
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    // Verify authentication
    const user = await verifyToken(request);
    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid doubt ID', 400);
    }

    // Find the existing doubt
    const existingDoubt = await Doubt.findById(id);
    if (!existingDoubt) {
      return errorResponse('Doubt not found', 404);
    }

    // Check permissions - only the author or admin can delete
    const canDelete = 
      existingDoubt.askedBy.toString() === user.userId ||
      user.role === 'admin';

    if (!canDelete) {
      return errorResponse('You do not have permission to delete this doubt', 403);
    }

    // Delete doubt
    await Doubt.findByIdAndDelete(id);

    return successResponse('Doubt deleted successfully', null);

  } catch (error: any) {
    console.error('Error deleting doubt:', error);
    return errorResponse('Failed to delete doubt', 500);
  }
}