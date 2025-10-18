import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { NotificationType, NotificationPriority } from '@/models/NotificationModel';

/**
 * Predefined notification templates for common scenarios
 */
const NOTIFICATION_TEMPLATES = {
  assignment: {
    new_assignment: {
      title: 'New Assignment: {{assignmentTitle}}',
      message: 'A new {{subject}} assignment "{{assignmentTitle}}" has been posted by {{teacherName}}. Due date: {{dueDate}}.',
      type: NotificationType.ASSIGNMENT,
      priority: NotificationPriority.MEDIUM,
      actions: [
        { label: 'View Assignment', url: '/assignments/{{assignmentId}}', type: 'primary' },
        { label: 'View All Assignments', url: '/assignments', type: 'secondary' }
      ]
    },
    assignment_due_reminder: {
      title: 'Assignment Due Soon: {{assignmentTitle}}',
      message: 'Your {{subject}} assignment "{{assignmentTitle}}" is due in {{timeRemaining}}. Don\'t forget to submit!',
      type: NotificationType.REMINDER,
      priority: NotificationPriority.HIGH,
      actions: [
        { label: 'Submit Now', url: '/assignments/{{assignmentId}}/submit', type: 'primary' },
        { label: 'View Details', url: '/assignments/{{assignmentId}}', type: 'secondary' }
      ]
    },
    assignment_graded: {
      title: 'Assignment Graded: {{assignmentTitle}}',
      message: 'Your {{subject}} assignment has been graded. Score: {{score}}/{{maxScore}}. {{feedback}}',
      type: NotificationType.GRADE,
      priority: NotificationPriority.MEDIUM,
      actions: [
        { label: 'View Results', url: '/assignments/{{assignmentId}}/results', type: 'primary' }
      ]
    },
    assignment_overdue: {
      title: 'Overdue Assignment: {{assignmentTitle}}',
      message: 'Your {{subject}} assignment "{{assignmentTitle}}" was due on {{dueDate}} and is now overdue.',
      type: NotificationType.ASSIGNMENT,
      priority: NotificationPriority.HIGH,
      actions: [
        { label: 'Submit Late', url: '/assignments/{{assignmentId}}/submit', type: 'primary' }
      ]
    }
  },

  class: {
    class_scheduled: {
      title: 'Upcoming Class: {{className}}',
      message: 'Your {{subject}} class is scheduled for {{startTime}} in {{location}}. Join the session on time.',
      type: NotificationType.CLASS,
      priority: NotificationPriority.MEDIUM,
      actions: [
        { label: 'Join Class', url: '/live-classes/{{classId}}/join', type: 'primary' },
        { label: 'View Schedule', url: '/schedule', type: 'secondary' }
      ]
    },
    class_cancelled: {
      title: 'Class Cancelled: {{className}}',
      message: 'Your {{subject}} class scheduled for {{startTime}} has been cancelled. {{reason}}',
      type: NotificationType.CLASS,
      priority: NotificationPriority.HIGH,
      actions: [
        { label: 'View Schedule', url: '/schedule', type: 'primary' }
      ]
    },
    class_rescheduled: {
      title: 'Class Rescheduled: {{className}}',
      message: 'Your {{subject}} class has been moved from {{oldTime}} to {{newTime}}. Location: {{location}}',
      type: NotificationType.CLASS,
      priority: NotificationPriority.HIGH,
      actions: [
        { label: 'View New Schedule', url: '/schedule', type: 'primary' }
      ]
    },
    class_reminder: {
      title: 'Class Starting Soon: {{className}}',
      message: 'Your {{subject}} class starts in {{timeRemaining}}. Get ready to join!',
      type: NotificationType.REMINDER,
      priority: NotificationPriority.MEDIUM,
      actions: [
        { label: 'Join Now', url: '/live-classes/{{classId}}/join', type: 'primary' }
      ]
    }
  },

  fee: {
    fee_due_reminder: {
      title: 'Fee Payment Due: {{feeType}}',
      message: 'Your {{feeType}} payment of ₹{{amount}} is due on {{dueDate}}. Pay now to avoid late fees.',
      type: NotificationType.FEE,
      priority: NotificationPriority.HIGH,
      actions: [
        { label: 'Pay Now', url: '/fees/{{feeId}}/pay', type: 'primary' },
        { label: 'View Details', url: '/fees', type: 'secondary' }
      ]
    },
    fee_overdue: {
      title: 'Overdue Payment: {{feeType}}',
      message: 'Your {{feeType}} payment of ₹{{amount}} was due on {{dueDate}} and is now overdue. Late fees may apply.',
      type: NotificationType.FEE,
      priority: NotificationPriority.CRITICAL,
      actions: [
        { label: 'Pay Immediately', url: '/fees/{{feeId}}/pay', type: 'primary' }
      ]
    },
    payment_received: {
      title: 'Payment Received: {{feeType}}',
      message: 'We have received your payment of ₹{{amount}} for {{feeType}}. Transaction ID: {{transactionId}}',
      type: NotificationType.FEE,
      priority: NotificationPriority.LOW,
      actions: [
        { label: 'Download Receipt', url: '/fees/{{feeId}}/receipt', type: 'primary' }
      ]
    }
  },

  doubt: {
    doubt_answered: {
      title: 'Your Question Was Answered',
      message: '{{teacherName}} has answered your question about "{{questionTitle}}". Check out the response!',
      type: NotificationType.DOUBT,
      priority: NotificationPriority.MEDIUM,
      actions: [
        { label: 'View Answer', url: '/doubts/{{doubtId}}', type: 'primary' },
        { label: 'Ask Follow-up', url: '/doubts/{{doubtId}}/reply', type: 'secondary' }
      ]
    },
    new_doubt_received: {
      title: 'New Question from {{studentName}}',
      message: 'A student has asked a question about {{subject}}: "{{questionTitle}}"',
      type: NotificationType.DOUBT,
      priority: NotificationPriority.MEDIUM,
      actions: [
        { label: 'Answer Question', url: '/doubts/{{doubtId}}/answer', type: 'primary' },
        { label: 'View All Questions', url: '/doubts', type: 'secondary' }
      ]
    }
  },

  mentorship: {
    session_scheduled: {
      title: 'Mentorship Session Confirmed',
      message: 'Your mentorship session with {{mentorName}} is confirmed for {{sessionTime}}. Topic: {{topic}}',
      type: NotificationType.MENTORSHIP,
      priority: NotificationPriority.MEDIUM,
      actions: [
        { label: 'Join Session', url: '/mentorship/{{sessionId}}/join', type: 'primary' },
        { label: 'View Details', url: '/mentorship/{{sessionId}}', type: 'secondary' }
      ]
    },
    session_reminder: {
      title: 'Mentorship Session Starting Soon',
      message: 'Your mentorship session with {{mentorName}} starts in {{timeRemaining}}.',
      type: NotificationType.REMINDER,
      priority: NotificationPriority.HIGH,
      actions: [
        { label: 'Join Now', url: '/mentorship/{{sessionId}}/join', type: 'primary' }
      ]
    }
  },

  system: {
    welcome_student: {
      title: 'Welcome to SikshaLink! 🎓',
      message: 'Welcome {{studentName}}! Your account has been successfully created. Start exploring your courses and assignments.',
      type: NotificationType.SYSTEM,
      priority: NotificationPriority.LOW,
      actions: [
        { label: 'Complete Profile', url: '/profile', type: 'primary' },
        { label: 'Explore Dashboard', url: '/dashboard', type: 'secondary' }
      ]
    },
    welcome_teacher: {
      title: 'Welcome to SikshaLink! 👩‍🏫',
      message: 'Welcome {{teacherName}}! Your instructor account is ready. Start creating courses and managing students.',
      type: NotificationType.SYSTEM,
      priority: NotificationPriority.LOW,
      actions: [
        { label: 'Create First Assignment', url: '/assignments/create', type: 'primary' },
        { label: 'View Dashboard', url: '/dashboard', type: 'secondary' }
      ]
    },
    maintenance_notice: {
      title: 'Scheduled Maintenance Notice',
      message: 'SikshaLink will be under maintenance on {{maintenanceDate}} from {{startTime}} to {{endTime}}. Please save your work.',
      type: NotificationType.SYSTEM,
      priority: NotificationPriority.HIGH,
      actions: [
        { label: 'Learn More', url: '/maintenance-info', type: 'primary' }
      ]
    }
  },

  announcement: {
    general_announcement: {
      title: '📢 {{announcementTitle}}',
      message: '{{announcementContent}}',
      type: NotificationType.ANNOUNCEMENT,
      priority: NotificationPriority.MEDIUM,
      actions: [
        { label: 'Read Full Announcement', url: '/announcements/{{announcementId}}', type: 'primary' }
      ]
    },
    holiday_notice: {
      title: '🏖️ Holiday Notice: {{holidayName}}',
      message: 'Classes will be suspended on {{holidayDate}} in observance of {{holidayName}}. Regular classes will resume on {{resumeDate}}.',
      type: NotificationType.ANNOUNCEMENT,
      priority: NotificationPriority.MEDIUM,
      actions: [
        { label: 'View Academic Calendar', url: '/calendar', type: 'primary' }
      ]
    }
  }
};

/**
 * GET /api/notifications/templates - Get all available notification templates
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
    const category = searchParams.get('category');
    const type = searchParams.get('type');

    let templates = NOTIFICATION_TEMPLATES;

    // Filter by category if specified
    if (category && (templates as any)[category]) {
      templates = { [category]: (templates as any)[category] } as any;
    }

    // Further filter by type if specified
    if (type) {
      const filteredTemplates: any = {};
      Object.keys(templates).forEach(cat => {
        const categoryTemplates = (templates as any)[cat];
        const matchingTemplates = Object.keys(categoryTemplates).reduce((acc: any, key) => {
          if (categoryTemplates[key].type === type) {
            acc[key] = categoryTemplates[key];
          }
          return acc;
        }, {});
        if (Object.keys(matchingTemplates).length > 0) {
          filteredTemplates[cat] = matchingTemplates;
        }
      });
      templates = filteredTemplates;
    }

    // Add template metadata
    const templatesWithMetadata = Object.keys(templates).reduce((acc: any, category) => {
      const categoryTemplates = (templates as any)[category];
      acc[category] = Object.keys(categoryTemplates).reduce((catAcc: any, templateKey) => {
        const template = categoryTemplates[templateKey];
        catAcc[templateKey] = {
          ...template,
          metadata: {
            id: `${category}.${templateKey}`,
            category,
            variables: extractVariables(template.title + ' ' + template.message),
            lastUpdated: '2024-01-01T00:00:00Z', // This would be dynamic in a real system
            usage: 'high' // This would come from analytics
          }
        };
        return catAcc;
      }, {});
      return acc;
    }, {});

    return successResponse({
      templates: templatesWithMetadata,
      categories: Object.keys(NOTIFICATION_TEMPLATES),
      totalTemplates: Object.values(NOTIFICATION_TEMPLATES).reduce(
        (total, category) => total + Object.keys(category).length, 0
      )
    }, 'Notification templates fetched successfully');

  } catch (error: any) {
    console.error('Error fetching notification templates:', error);
    return errorResponse('Failed to fetch notification templates', 500);
  }
}

/**
 * POST /api/notifications/templates - Create notification from template
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

    // Only teachers and admins can use templates
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse('Only teachers and admins can create notifications from templates', 403);
    }

    const body = await request.json();
    const { templateId, variables, recipients, overrides = {} } = body;

    if (!templateId) {
      return errorResponse('Template ID is required', 400);
    }

    if (!recipients || (!recipients.userIds && !recipients.roles && !recipients.classIds)) {
      return errorResponse('Recipients are required', 400);
    }

    // Parse template ID
    const [category, templateKey] = templateId.split('.');
    if (!category || !templateKey) {
      return errorResponse('Invalid template ID format. Use category.templateKey', 400);
    }

    // Get template
    const template = (NOTIFICATION_TEMPLATES as any)[category]?.[templateKey];
    if (!template) {
      return errorResponse('Template not found', 404);
    }

    // Replace variables in template
    const processedNotification = {
      title: replaceVariables(template.title, variables || {}),
      message: replaceVariables(template.message, variables || {}),
      type: template.type,
      priority: template.priority,
      actions: template.actions?.map((action: any) => ({
        ...action,
        url: replaceVariables(action.url, variables || {})
      })) || [],
      ...overrides // Allow overriding template values
    };

    // Create broadcast notification request
    const broadcastData = {
      ...processedNotification,
      recipients,
      deliveryChannels: overrides.deliveryChannels || ['in_app'],
      category: category,
      tags: [...(overrides.tags || []), `template:${templateId}`]
    };

    // Forward to broadcast endpoint logic (simplified here)
    // In a real implementation, you might call the broadcast service directly
    const response = await fetch(`${request.nextUrl.origin}/api/notifications/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || ''
      },
      body: JSON.stringify(broadcastData)
    });

    if (!response.ok) {
      throw new Error(`Broadcast failed: ${response.statusText}`);
    }

    const broadcastResult = await response.json();

    return successResponse({
      template: {
        id: templateId,
        category,
        templateKey,
        originalTemplate: template
      },
      processedNotification,
      variables,
      broadcastResult: broadcastResult.data
    }, 'Notification created from template successfully', 201);

  } catch (error: any) {
    console.error('Error creating notification from template:', error);
    return errorResponse('Failed to create notification from template', 500);
  }
}

/**
 * Helper function to extract variables from template strings
 */
function extractVariables(text: string): string[] {
  const variableRegex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = variableRegex.exec(text)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}

/**
 * Helper function to replace variables in template strings
 */
function replaceVariables(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}