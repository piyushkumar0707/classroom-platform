import { NextRequest, NextResponse } from 'next/server';
import Assignment from '@/models/AssignmentModel';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import mongoose from 'mongoose';

/**
 * GET /api/assignments/statistics - Get assignment statistics
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

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');
    const period = searchParams.get('period') || '30'; // days

    // Build query based on user role and permissions
    let query: any = {};
    
    // Filter by class if specified
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return errorResponse('Invalid class ID', 400);
      }
      query.class = new mongoose.Types.ObjectId(classId);
    }

    // Role-based filtering
    if (user.role === 'student') {
      // Students can only see statistics for assignments they have access to
      // This would require class membership validation in a real implementation
      return errorResponse('Students cannot access assignment statistics', 403);
    } else if (user.role === 'teacher') {
      // Teachers can only see statistics for their own assignments
      query.createdBy = new mongoose.Types.ObjectId(user.userId);
    } else if (user.role === 'admin') {
      // Admins can see all statistics, optionally filtered by teacher
      if (teacherId) {
        if (!mongoose.Types.ObjectId.isValid(teacherId)) {
          return errorResponse('Invalid teacher ID', 400);
        }
        query.createdBy = new mongoose.Types.ObjectId(teacherId);
      }
    }

    // Date filter for recent assignments
    const periodDays = parseInt(period);
    if (periodDays > 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);
      query.createdAt = { $gte: startDate };
    }

    // Fetch assignments with populated data
    const assignments = await Assignment.find(query)
      .populate('createdBy', 'name email')
      .populate('class', 'name')
      .populate('submissions.student', 'name email')
      .sort({ createdAt: -1 });

    // Calculate comprehensive statistics
    const totalAssignments = assignments.length;
    const publishedAssignments = assignments.filter(a => a.isPublished).length;
    const draftAssignments = totalAssignments - publishedAssignments;

    // Submission statistics
    let totalSubmissions = 0;
    let gradedSubmissions = 0;
    let lateSubmissions = 0;
    let totalMarks = 0;
    let totalMaxMarks = 0;
    let submissionsByDate: { [key: string]: number } = {};
    let gradeDistribution = {
      excellent: 0, // 90-100%
      good: 0,      // 80-89%
      average: 0,   // 70-79%
      poor: 0,      // 60-69%
      fail: 0       // Below 60%
    };

    assignments.forEach(assignment => {
      const submissions = assignment.submissions || [];
      totalSubmissions += submissions.length;

      submissions.forEach((submission: any) => {
        // Count late submissions
        if (submission.isLate) {
          lateSubmissions++;
        }

        // Track submissions by date
        const submissionDate = new Date(submission.submittedAt).toISOString().split('T')[0];
        submissionsByDate[submissionDate] = (submissionsByDate[submissionDate] || 0) + 1;

        // Count graded submissions and calculate grade distribution
        if (submission.marks !== undefined && submission.marks !== null) {
          gradedSubmissions++;
          totalMarks += submission.marks;
          totalMaxMarks += assignment.maxMarks;

          // Calculate percentage for grade distribution
          const percentage = (submission.marks / assignment.maxMarks) * 100;
          if (percentage >= 90) gradeDistribution.excellent++;
          else if (percentage >= 80) gradeDistribution.good++;
          else if (percentage >= 70) gradeDistribution.average++;
          else if (percentage >= 60) gradeDistribution.poor++;
          else gradeDistribution.fail++;
        }
      });
    });

    // Assignment type distribution
    const typeDistribution = assignments.reduce((acc: any, assignment) => {
      acc[assignment.type] = (acc[assignment.type] || 0) + 1;
      return acc;
    }, {});

    // Average statistics
    const averageScore = totalMaxMarks > 0 ? ((totalMarks / totalMaxMarks) * 100) : 0;
    const submissionRate = totalAssignments > 0 ? (totalSubmissions / (totalAssignments * 100)) * 100 : 0; // Assuming 100 students per class on average
    const gradingProgress = totalSubmissions > 0 ? (gradedSubmissions / totalSubmissions) * 100 : 0;

    // Recent activity (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const recentActivity = last7Days.map(date => ({
      date,
      submissions: submissionsByDate[date] || 0
    }));

    // Top performing assignments (by submission rate)
    const assignmentPerformance = assignments
      .filter(a => a.isPublished)
      .map(assignment => {
        const submissions = assignment.submissions || [];
        const avgScore = submissions.length > 0 
          ? submissions
              .filter((sub: any) => sub.marks !== undefined)
              .reduce((sum: number, sub: any) => sum + sub.marks, 0) / submissions.filter((sub: any) => sub.marks !== undefined).length
          : 0;
        
        return {
          id: assignment._id,
          title: assignment.title,
          submissionCount: submissions.length,
          averageScore: avgScore,
          maxMarks: assignment.maxMarks,
          dueDate: assignment.dueDate,
          class: assignment.class
        };
      })
      .sort((a, b) => b.submissionCount - a.submissionCount)
      .slice(0, 5);

    // Overdue assignments
    const now = new Date();
    const overdueAssignments = assignments
      .filter(a => a.isPublished && a.dueDate < now && a.submissionsAllowed)
      .map(assignment => ({
        id: assignment._id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        submissionCount: assignment.submissions?.length || 0,
        class: assignment.class
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const statistics = {
      overview: {
        totalAssignments,
        publishedAssignments,
        draftAssignments,
        totalSubmissions,
        gradedSubmissions,
        lateSubmissions,
        averageScore: Math.round(averageScore * 100) / 100,
        submissionRate: Math.round(submissionRate * 100) / 100,
        gradingProgress: Math.round(gradingProgress * 100) / 100
      },
      distributions: {
        gradeDistribution,
        typeDistribution
      },
      trends: {
        recentActivity,
        submissionsByDate: Object.entries(submissionsByDate)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      },
      topPerforming: assignmentPerformance,
      overdue: overdueAssignments,
      metadata: {
        period: `${period} days`,
        generatedAt: new Date().toISOString(),
        classId,
        teacherId: user.role === 'teacher' ? user.userId : teacherId
      }
    };

    return successResponse(statistics, 'Assignment statistics fetched successfully');

  } catch (error: any) {
    console.error('Error fetching assignment statistics:', error);
    return errorResponse('Failed to fetch assignment statistics', 500);
  }
}