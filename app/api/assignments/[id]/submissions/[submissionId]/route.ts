import { NextRequest, NextResponse } from 'next/server';
import Assignment from '@/models/AssignmentModel';
import connectToDatabase from '@/lib/db';
import { gradeSubmissionSchema } from '@/lib/validations/assignment';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * PUT /api/assignments/[id]/submissions/[submissionId] - Grade a submission
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; submissionId: string } }
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

    // Only teachers and admins can grade assignments
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse('Only teachers and admins can grade assignments', 403);
    }

    const { id, submissionId } = params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(submissionId)) {
      return errorResponse('Invalid assignment or submission ID', 400);
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = gradeSubmissionSchema.parse(body);

    // Find assignment
    const assignment = await Assignment.findById(id)
      .populate('createdBy', 'name email')
      .populate('submissions.student', 'name email avatar')
      .populate('submissions.gradedBy', 'name email');

    if (!assignment) {
      return errorResponse('Assignment not found', 404);
    }

    // Check if user has permission to grade this assignment
    const canGrade = user.role === 'admin' || 
                    assignment.createdBy._id.toString() === user.userId;

    if (!canGrade) {
      return errorResponse('You do not have permission to grade this assignment', 403);
    }

    // Find submission
    const submissionIndex = assignment.submissions.findIndex(
      (sub: any) => sub._id.toString() === submissionId
    );

    if (submissionIndex === -1) {
      return errorResponse('Submission not found', 404);
    }

    const submission = assignment.submissions[submissionIndex];

    // Validate marks against assignment max marks
    if (validatedData.marks > assignment.maxMarks) {
      return errorResponse(`Marks cannot exceed maximum marks (${assignment.maxMarks})`, 400);
    }

    // Update submission with grades
    assignment.submissions[submissionIndex] = {
      ...submission,
      marks: validatedData.marks,
      feedback: validatedData.feedback,
      gradedBy: new mongoose.Types.ObjectId(user.userId),
      gradedAt: new Date()
    };

    await assignment.save();

    // Get updated submission with populated data
    const updatedAssignment = await Assignment.findById(id)
      .populate('submissions.student', 'name email avatar')
      .populate('submissions.gradedBy', 'name email avatar');

    const gradedSubmission = updatedAssignment?.submissions.find(
      (sub: any) => sub._id.toString() === submissionId
    );

    return successResponse(gradedSubmission, 'Submission graded successfully');

  } catch (error: any) {
    console.error('Error grading submission:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.message);
    }
    
    if (error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400, error.message);
    }
    
    return errorResponse('Failed to grade submission', 500);
  }
}

/**
 * DELETE /api/assignments/[id]/submissions/[submissionId] - Delete a submission (student only, before grading)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; submissionId: string } }
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

    const { id, submissionId } = params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(submissionId)) {
      return errorResponse('Invalid assignment or submission ID', 400);
    }

    // Find assignment
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return errorResponse('Assignment not found', 404);
    }

    // Find submission
    const submissionIndex = assignment.submissions.findIndex(
      (sub: any) => sub._id.toString() === submissionId
    );

    if (submissionIndex === -1) {
      return errorResponse('Submission not found', 404);
    }

    const submission = assignment.submissions[submissionIndex];

    // Check permissions - only the student who submitted or admin/teacher can delete
    const isOwner = submission.student.toString() === user.userId;
    const isAuthorized = user.role === 'admin' || user.role === 'teacher' || isOwner;

    if (!isAuthorized) {
      return errorResponse('You do not have permission to delete this submission', 403);
    }

    // Students can only delete their own ungraded submissions
    if (user.role === 'student' && !isOwner) {
      return errorResponse('You can only delete your own submissions', 403);
    }

    if (user.role === 'student' && submission.marks !== undefined) {
      return errorResponse('Cannot delete graded submissions', 400);
    }

    // Remove submission
    assignment.submissions.splice(submissionIndex, 1);
    await assignment.save();

    return successResponse({}, 'Submission deleted successfully');

  } catch (error: any) {
    console.error('Error deleting submission:', error);
    return errorResponse('Failed to delete submission', 500);
  }
}