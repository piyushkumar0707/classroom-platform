import { NextRequest, NextResponse } from 'next/server';
import Assignment from '@/models/AssignmentModel';
import connectToDatabase from '@/lib/db';
import { createAssignmentSchema, assignmentQuerySchema } from '@/lib/validations/assignment';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';

/**
 * GET /api/assignments - Fetch assignments with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedQuery = assignmentQuerySchema.parse(queryParams);
    const {
      page,
      limit,
      subject,
      assignmentType,
      status,
      isPublished,
      createdBy,
      class: classId,
      tags,
      search,
      sortBy,
      sortOrder,
      dueDateFrom,
      dueDateTo
    } = validatedQuery;

    // Build filter object
    const filter: any = {};
    
    if (subject) filter.subject = subject;
    if (assignmentType) filter.assignmentType = assignmentType;
    if (isPublished !== undefined) filter.isPublished = isPublished;
    if (createdBy) filter.createdBy = createdBy;
    if (classId) filter.class = classId;
    if (tags && tags.length > 0) filter.tags = { $in: tags };
    
    // Date range filter
    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
    }
    
    // Status-based filtering (computed based on current date and assignment properties)
    if (status) {
      const now = new Date();
      switch (status) {
        case 'draft':
          filter.isPublished = false;
          break;
        case 'active':
          filter.isPublished = true;
          filter.dueDate = { $gte: now };
          break;
        case 'overdue':
          filter.isPublished = true;
          filter.dueDate = { $lt: now };
          filter.submissionsAllowed = true;
          break;
        case 'completed':
          filter.isPublished = true;
          filter.dueDate = { $lt: now };
          filter.submissionsAllowed = false;
          break;
      }
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { instructions: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const assignments = await Assignment.find(filter)
      .populate('createdBy', 'name email role avatar')
      .populate('class', 'name subject')
      .populate('submissions.student', 'name email avatar')
      .populate('submissions.gradedBy', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Assignment.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return successResponse({
      assignments,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }, 'Assignments fetched successfully');

  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    return errorResponse(
      error.name === 'ZodError' ? 'Invalid query parameters' : 'Failed to fetch assignments',
      500,
      error.name === 'ZodError' ? error.message : undefined
    );
  }
}

/**
 * POST /api/assignments - Create a new assignment
 */
export async function POST(request: NextRequest) {
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

    // Check if user is teacher or admin
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse('Only teachers and admins can create assignments', 403);
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = createAssignmentSchema.parse(body);

    // Create new assignment
    const newAssignment = new Assignment({
      ...validatedData,
      createdBy: user.userId,
      dueDate: new Date(validatedData.dueDate)
    });

    await newAssignment.save();

    // Populate user data for response
    await newAssignment.populate('createdBy', 'name email role avatar');
    if (newAssignment.class) {
      await newAssignment.populate('class', 'name subject');
    }

    return successResponse(newAssignment, 'Assignment created successfully', 201);

  } catch (error: any) {
    console.error('Error creating assignment:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.message);
    }
    
    if (error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400, error.message);
    }
    
    return errorResponse('Failed to create assignment', 500);
  }
}