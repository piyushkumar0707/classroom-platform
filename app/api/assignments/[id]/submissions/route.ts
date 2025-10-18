import { NextRequest, NextResponse } from 'next/server';
import Assignment from '@/models/AssignmentModel';
import connectToDatabase from '@/lib/db';
import { createSubmissionSchema, gradeSubmissionSchema, submissionQuerySchema } from '@/lib/validations/assignment';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * GET /api/assignments/[id]/submissions - Get submissions for an assignment
 */
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedQuery = submissionQuerySchema.parse(queryParams);
    const { page, limit, student, isGraded, isLate, sortBy, sortOrder } = validatedQuery;

    // Find assignment
    const assignment = await Assignment.findById(id)
      .populate('createdBy', 'name email role')
      .populate('submissions.student', 'name email avatar')
      .populate('submissions.gradedBy', 'name email avatar');

    if (!assignment) {
      return errorResponse('Assignment not found', 404);
    }

    // Check permissions - only assignment creator, admin, or student (for their own submission) can view
    const isTeacher = user.role === 'teacher' || user.role === 'admin';
    const isAssignmentCreator = assignment.createdBy._id.toString() === user.userId;
    
    if (!isTeacher && !isAssignmentCreator && user.role !== 'student') {
      return errorResponse('You do not have permission to view these submissions', 403);
    }

    // Filter submissions based on query parameters and user permissions
    let submissions = [...assignment.submissions];

    // If user is student, only show their own submission
    if (user.role === 'student' && !isAssignmentCreator) {
      submissions = submissions.filter(sub => sub.student._id.toString() === user.userId);
    }

    // Apply filters
    if (student && (isTeacher || isAssignmentCreator)) {
      submissions = submissions.filter(sub => sub.student._id.toString() === student);
    }

    if (isGraded !== undefined) {
      submissions = submissions.filter(sub => 
        isGraded ? (sub.marks !== undefined && sub.gradedAt) : (sub.marks === undefined || !sub.gradedAt)
      );
    }

    if (isLate !== undefined) {
      submissions = submissions.filter(sub => sub.isLate === isLate);
    }

    // Sort submissions
    submissions.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'submittedAt':
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
          break;
        case 'marks':
          aValue = a.marks || 0;
          bValue = b.marks || 0;
          break;
        case 'gradedAt':
          aValue = a.gradedAt ? new Date(a.gradedAt) : new Date(0);
          bValue = b.gradedAt ? new Date(b.gradedAt) : new Date(0);
          break;
        default:
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedSubmissions = submissions.slice(skip, skip + limit);
    const total = submissions.length;
    const totalPages = Math.ceil(total / limit);

    return successResponse({
      submissions: paginatedSubmissions,
      assignment: {
        id: assignment._id,
        title: assignment.title,
        maxMarks: assignment.maxMarks,
        dueDate: assignment.dueDate
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }, 'Submissions fetched successfully');

  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    return errorResponse(
      error.name === 'ZodError' ? 'Invalid query parameters' : 'Failed to fetch submissions',
      500,
      error.name === 'ZodError' ? error.message : undefined
    );
  }
}

/**
 * POST /api/assignments/[id]/submissions - Submit an assignment
 */
export async function POST(
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

    // Only students can submit assignments
    if (user.role !== 'student') {
      return errorResponse('Only students can submit assignments', 403);
    }

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid assignment ID', 400);
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = createSubmissionSchema.parse(body);

    // Find assignment
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return errorResponse('Assignment not found', 404);
    }

    // Check if assignment allows submissions
    if (!assignment.submissionsAllowed) {
      return errorResponse('Submissions are not allowed for this assignment', 400);
    }

    // Check if assignment is published
    if (!assignment.isPublished) {
      return errorResponse('Cannot submit to unpublished assignment', 400);
    }

    // Check if student has already submitted
    const existingSubmission = assignment.submissions.find(
      (sub: any) => sub.student.toString() === user.userId
    );

    if (existingSubmission) {
      return errorResponse('You have already submitted this assignment', 400);
    }

    // Check if submission is late
    const now = new Date();
    const isLate = now > assignment.dueDate;

    // Check if late submissions are allowed
    if (isLate && !assignment.lateSubmissionAllowed) {
      return errorResponse('Late submissions are not allowed for this assignment', 400);
    }

    // Create submission
    const newSubmission = {
      student: new mongoose.Types.ObjectId(user.userId),
      content: validatedData.content,
      attachments: validatedData.attachments,
      submittedAt: now,
      isLate
    };

    // Add submission to assignment
    assignment.submissions.push(newSubmission);
    await assignment.save();

    // Get the created submission with populated data
    const updatedAssignment = await Assignment.findById(id)
      .populate('submissions.student', 'name email avatar')
      .select('submissions');

    const createdSubmission = updatedAssignment?.submissions[updatedAssignment.submissions.length - 1];

    return successResponse(createdSubmission, 'Assignment submitted successfully', 201);

  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.message);
    }
    
    if (error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400, error.message);
    }
    
    return errorResponse('Failed to submit assignment', 500);
  }
}