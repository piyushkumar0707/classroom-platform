import { NextRequest, NextResponse } from 'next/server';
import Doubt from '@/models/DoubtModel';
import connectToDatabase from '@/lib/db';
import { createDoubtSchema, doubtQuerySchema } from '@/lib/validations/doubt';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';

/**
 * GET /api/doubts - Fetch doubts with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedQuery = doubtQuerySchema.parse(queryParams);
    const {
      page,
      limit,
      subject,
      status,
      priority,
      assignedTo,
      askedBy,
      tags,
      search,
      sortBy,
      sortOrder
    } = validatedQuery;

    // Build filter object
    const filter: any = {};
    
    if (subject) filter.subject = subject;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (askedBy) filter.askedBy = askedBy;
    if (tags && tags.length > 0) filter.tags = { $in: tags };
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const doubts = await Doubt.find(filter)
      .populate('askedBy', 'name email role avatar')
      .populate('assignedTo', 'name email role avatar')
      .populate('resolvedBy', 'name email role avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Doubt.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return successResponse(
      {
        doubts,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      'Doubts fetched successfully'
    );

  } catch (error: any) {
    console.error('Error fetching doubts:', error);
    return errorResponse(
      error.name === 'ZodError' ? 'Invalid query parameters' : 'Failed to fetch doubts',
      500,
      error.name === 'ZodError' ? error.errors : undefined
    );
  }
}

/**
 * POST /api/doubts - Create a new doubt
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

    const body = await request.json();
    
    // Validate request body
    const validatedData = createDoubtSchema.parse(body);

    // Create new doubt
    const newDoubt = new Doubt({
      ...validatedData,
      askedBy: user.userId
    });

    await newDoubt.save();

    // Populate user data for response
    await newDoubt.populate('askedBy', 'name email role avatar');

    return successResponse('Doubt created successfully', newDoubt, 201);

  } catch (error: any) {
    console.error('Error creating doubt:', error);
    
    if (error.name === 'ZodError') {
      return errorResponse('Invalid input data', 400, error.errors);
    }
    
    if (error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400, error.errors);
    }
    
    return errorResponse('Failed to create doubt', 500);
  }
}