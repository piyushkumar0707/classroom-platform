import { NextRequest, NextResponse } from 'next/server';
import Assignment from '@/models/AssignmentModel';
import connectToDatabase from '@/lib/db';
import { updateAssignmentSchema } from '@/lib/validations/assignment';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * GET /api/assignments/[id] - Get a specific assignment by ID
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
      return errorResponse('Invalid assignment ID', 400);
    }

    // Find assignment
    const assignment = await Assignment.findById(id)
      .populate('createdBy', 'name email role avatar')
      .populate('class', 'name subject')
      .populate('submissions.student', 'name email avatar')
      .populate('submissions.gradedBy', 'name email avatar')
      .lean();

    if (!assignment) {
      return errorResponse('Assignment not found', 404);
    }

    return successResponse(assignment, 'Assignment fetched successfully');

  } catch (error: any) {
    console.error('Error fetching assignment:', error);
    return errorResponse('Failed to fetch assignment', 500);
  }
}

/**
 * PUT /api/assignments/[id] - Update an assignment
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
      return errorResponse('Invalid assignment ID', 400);
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = updateAssignmentSchema.parse(body);

    // Find the existing assignment
    const existingAssignment = await Assignment.findById(id);
    if (!existingAssignment) {
      return errorResponse('Assignment not found', 404);
    }

    // Check permissions - only the creator or admin can update
    const canUpdate = 
      existingAssignment.createdBy.toString() === user.userId ||
      user.role === 'admin';

    if (!canUpdate) {
      return errorResponse('You do not have permission to update this assignment', 403);
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }

    // Update assignment
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email role avatar')
      .populate('class', 'name subject')
      .populate('submissions.student', 'name email avatar')
      .populate('submissions.gradedBy', 'name email avatar');

    return successResponse(updatedAssignment, 'Assignment updated successfully');

  } catch (error: any) {
    console.error('Error updating assignment:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.message);
    }
    
    if (error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400, error.message);
    }
    
    return errorResponse('Failed to update assignment', 500);
  }
}

/**
 * DELETE /api/assignments/[id] - Delete an assignment
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
      return errorResponse('Invalid assignment ID', 400);
    }

    // Find the existing assignment
    const existingAssignment = await Assignment.findById(id);
    if (!existingAssignment) {
      return errorResponse('Assignment not found', 404);
    }

    // Check permissions - only the creator or admin can delete
    const canDelete = 
      existingAssignment.createdBy.toString() === user.userId ||
      user.role === 'admin';

    if (!canDelete) {
      return errorResponse('You do not have permission to delete this assignment', 403);
    }

    // Check if assignment has submissions
    if (existingAssignment.submissions && existingAssignment.submissions.length > 0) {
      return errorResponse('Cannot delete assignment that has submissions', 400);
    }

    // Delete assignment
    await Assignment.findByIdAndDelete(id);

    return successResponse(null, 'Assignment deleted successfully');

  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    return errorResponse('Failed to delete assignment', 500);
  }
}