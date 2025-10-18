import { NextRequest, NextResponse } from 'next/server';
import Assignment from '@/models/AssignmentModel';
import connectToDatabase from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * POST /api/assignments/import - Import assignments from JSON/CSV
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

    // Only teachers and admins can import assignments
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse('Only teachers and admins can import assignments', 403);
    }

    const body = await request.json();
    const { assignments, format = 'json', options = {} } = body;

    if (!assignments || !Array.isArray(assignments)) {
      return errorResponse('Invalid assignments data - must be an array', 400);
    }

    const importResults = {
      total: assignments.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ index: number; error: string; data: any }>
    };

    const createdAssignments = [];

    for (let i = 0; i < assignments.length; i++) {
      try {
        const assignmentData = assignments[i];

        // Basic validation and transformation
        const processedData = {
          title: assignmentData.title?.trim(),
          description: assignmentData.description?.trim(),
          instructions: assignmentData.instructions?.trim() || '',
          subject: assignmentData.subject?.toLowerCase(),
          dueDate: new Date(assignmentData.dueDate),
          maxMarks: Number(assignmentData.maxMarks),
          class: assignmentData.class || assignmentData.classId,
          type: assignmentData.type || 'homework',
          createdBy: new mongoose.Types.ObjectId(user.userId),
          attachments: Array.isArray(assignmentData.attachments) ? assignmentData.attachments : [],
          isPublished: options.autoPublish === true ? true : (assignmentData.isPublished || false),
          submissionsAllowed: assignmentData.submissionsAllowed !== false,
          lateSubmissionAllowed: assignmentData.lateSubmissionAllowed === true,
          rubric: assignmentData.rubric || []
        };

        // Validate required fields
        if (!processedData.title || processedData.title.length < 3) {
          throw new Error('Title must be at least 3 characters long');
        }

        if (!processedData.description || processedData.description.length < 10) {
          throw new Error('Description must be at least 10 characters long');
        }

        if (!processedData.subject) {
          throw new Error('Subject is required');
        }

        if (isNaN(processedData.maxMarks) || processedData.maxMarks < 1) {
          throw new Error('Max marks must be a positive number');
        }

        if (isNaN(processedData.dueDate.getTime())) {
          throw new Error('Invalid due date');
        }

        if (processedData.class && !mongoose.Types.ObjectId.isValid(processedData.class)) {
          throw new Error('Invalid class ID');
        }

        // Create assignment
        const newAssignment = new Assignment(processedData);
        const savedAssignment = await newAssignment.save();
        
        createdAssignments.push({
          id: savedAssignment._id,
          title: savedAssignment.title,
          originalIndex: i
        });

        importResults.successful++;

      } catch (error: any) {
        importResults.failed++;
        importResults.errors.push({
          index: i,
          error: error.message || 'Unknown error occurred',
          data: assignments[i]
        });
      }
    }

    return successResponse({
      results: importResults,
      createdAssignments,
      message: `Import completed. ${importResults.successful} successful, ${importResults.failed} failed.`
    }, 'Assignment import completed', 201);

  } catch (error: any) {
    console.error('Error importing assignments:', error);
    return errorResponse('Failed to import assignments', 500);
  }
}

/**
 * GET /api/assignments/export - Export assignments to JSON/CSV
 */
export async function GET(request: NextRequest) {
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

    // Only teachers and admins can export assignments
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse('Only teachers and admins can export assignments', 403);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includeSubmissions = searchParams.get('includeSubmissions') === 'true';
    const classId = searchParams.get('classId');
    const subject = searchParams.get('subject');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query: any = {};
    
    if (user.role === 'teacher') {
      query.createdBy = new mongoose.Types.ObjectId(user.userId);
    }

    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      query.class = new mongoose.Types.ObjectId(classId);
    }

    if (subject) {
      query.subject = subject.toLowerCase();
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Fetch assignments
    let assignmentQuery = Assignment.find(query)
      .populate('createdBy', 'name email')
      .populate('class', 'name code')
      .sort({ createdAt: -1 });

    if (!includeSubmissions) {
      assignmentQuery = assignmentQuery.select('-submissions');
    } else {
      assignmentQuery = assignmentQuery.populate('submissions.student', 'name email');
    }

    const assignments = await assignmentQuery.exec();

    // Transform data based on format
    let exportData;
    let filename;
    let mimeType;

    if (format === 'csv') {
      // CSV format - flatten the data
      const csvData = assignments.map(assignment => ({
        id: assignment._id.toString(),
        title: assignment.title,
        description: assignment.description,
        subject: assignment.subject,
        type: assignment.type,
        maxMarks: assignment.maxMarks,
        dueDate: assignment.dueDate.toISOString(),
        createdAt: assignment.createdAt.toISOString(),
        isPublished: assignment.isPublished,
        submissionsAllowed: assignment.submissionsAllowed,
        lateSubmissionAllowed: assignment.lateSubmissionAllowed,
        createdBy: assignment.createdBy?.name || 'Unknown',
        createdByEmail: assignment.createdBy?.email || '',
        className: assignment.class?.name || '',
        classCode: assignment.class?.code || '',
        submissionCount: assignment.submissions?.length || 0,
        attachmentCount: assignment.attachments?.length || 0
      }));

      // Convert to CSV string
      const headers = Object.keys(csvData[0] || {});
      const csvRows = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = (row as any)[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          }).join(',')
        )
      ];
      
      exportData = csvRows.join('\n');
      filename = `assignments-export-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';

    } else {
      // JSON format - preserve full structure
      exportData = assignments.map(assignment => {
        const assignmentObj = assignment.toObject();
        
        // Clean up for export
        return {
          ...assignmentObj,
          _id: assignmentObj._id.toString(),
          createdBy: assignmentObj.createdBy?._id ? {
            id: assignmentObj.createdBy._id.toString(),
            name: assignmentObj.createdBy.name,
            email: assignmentObj.createdBy.email
          } : null,
          class: assignmentObj.class?._id ? {
            id: assignmentObj.class._id.toString(),
            name: assignmentObj.class.name,
            code: assignmentObj.class.code
          } : null,
          submissions: includeSubmissions ? assignmentObj.submissions?.map((sub: any) => ({
            ...sub,
            _id: sub._id.toString(),
            student: sub.student?._id ? {
              id: sub.student._id.toString(),
              name: sub.student.name,
              email: sub.student.email
            } : sub.student
          })) : undefined
        };
      });

      filename = `assignments-export-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    }

    return successResponse({
      data: exportData,
      metadata: {
        exportedAt: new Date().toISOString(),
        format,
        totalAssignments: assignments.length,
        includeSubmissions,
        filters: { classId, subject, startDate, endDate },
        filename,
        mimeType
      }
    }, 'Assignments exported successfully');

  } catch (error: any) {
    console.error('Error exporting assignments:', error);
    return errorResponse('Failed to export assignments', 500);
  }
}