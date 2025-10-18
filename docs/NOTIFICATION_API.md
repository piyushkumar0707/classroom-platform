# Notification Management API Documentation

This document provides comprehensive documentation for the Notification Management System API in the classroom platform.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URLs](#base-urls)
4. [Error Handling](#error-handling)
5. [Notification Types & Priorities](#notification-types--priorities)
6. [Core Notifications API](#core-notifications-api)
7. [Individual Notification Operations](#individual-notification-operations)
8. [Read/Unread Management](#readunread-management)
9. [Statistics & Analytics](#statistics--analytics)
10. [Broadcast Notifications](#broadcast-notifications)
11. [Bulk Operations](#bulk-operations)
12. [Notification Templates](#notification-templates)
13. [Data Models](#data-models)
14. [WebSocket Events](#websocket-events)
15. [Integration Examples](#integration-examples)

## Overview

The Notification Management System provides a comprehensive solution for managing notifications in educational platforms. It supports:

- **Multi-channel delivery**: In-app, email, SMS, push notifications
- **Rich content**: Images, actions, metadata
- **Advanced filtering**: By type, priority, category, date ranges
- **Bulk operations**: Create, update, delete multiple notifications
- **Analytics**: Comprehensive statistics and engagement metrics
- **Templates**: Pre-defined templates for common scenarios
- **Real-time updates**: WebSocket support for instant notifications

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Role-based Access Control

- **Admin**: Full access to all notification operations and analytics
- **Teacher**: Can create, manage notifications for their students/classes
- **Student**: Can view their notifications, mark as read/unread

## Base URLs

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information (optional)"
}
```

Common HTTP status codes:
- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Server-side error

## Notification Types & Priorities

### Notification Types

```typescript
enum NotificationType {
  ASSIGNMENT = 'assignment',
  CLASS = 'class',
  ATTENDANCE = 'attendance',
  GRADE = 'grade',
  FEE = 'fee',
  DOUBT = 'doubt',
  MENTORSHIP = 'mentorship',
  SYSTEM = 'system',
  ANNOUNCEMENT = 'announcement',
  REMINDER = 'reminder'
}
```

### Priority Levels

```typescript
enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### Delivery Channels

```typescript
enum DeliveryChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}
```

## Core Notifications API

### List User Notifications

**GET** `/notifications`

Retrieves user's notifications with advanced filtering and pagination.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 20 | Number of items per page (max 100) |
| `type` | string | - | Filter by notification type |
| `priority` | string | - | Filter by priority level |
| `isRead` | boolean | - | Filter by read status |
| `category` | string | - | Filter by category |
| `search` | string | - | Search in title and message |
| `sortBy` | string | createdAt | Sort field |
| `sortOrder` | string | desc | Sort order (asc/desc) |
| `includeExpired` | boolean | false | Include expired notifications |
| `tags` | string | - | Comma-separated tags filter |
| `dateFrom` | string | - | Start date filter (ISO string) |
| `dateTo` | string | - | End date filter (ISO string) |
| `campaignId` | string | - | Filter by campaign ID |

#### Response

```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": {
    "notifications": [
      {
        "id": "notification_id",
        "title": "Assignment Due Soon",
        "message": "Your Math assignment is due in 2 hours",
        "type": "assignment",
        "priority": "high",
        "isRead": false,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "expiresAt": "2024-01-20T10:00:00.000Z",
        "sender": {
          "name": "Prof. Smith",
          "email": "smith@example.com",
          "avatar": "https://example.com/avatar.jpg"
        },
        "actions": [
          {
            "label": "Submit Assignment",
            "url": "/assignments/123/submit",
            "type": "primary"
          }
        ],
        "metadata": {
          "assignmentId": "assignment_123",
          "customData": {...}
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 95,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {...}
  }
}
```

### Create Notification

**POST** `/notifications`

Creates a new notification. Only teachers and admins can create notifications.

#### Request Body

```json
{
  "title": "New Assignment Posted",
  "message": "A new Mathematics assignment has been posted. Due date: Jan 20, 2024",
  "type": "assignment",
  "priority": "medium",
  "recipient": "user_id",
  "deliveryChannels": ["in_app", "email"],
  "scheduledFor": "2024-01-15T14:00:00Z",
  "expiresAt": "2024-01-25T00:00:00Z",
  "imageUrl": "https://example.com/assignment-image.jpg",
  "actions": [
    {
      "label": "View Assignment",
      "url": "/assignments/123",
      "type": "primary"
    }
  ],
  "metadata": {
    "assignmentId": "assignment_123",
    "customData": {
      "subject": "Mathematics",
      "dueDate": "2024-01-20T23:59:59Z"
    }
  },
  "category": "academic",
  "tags": ["urgent", "assignment"]
}
```

## Individual Notification Operations

### Get Notification by ID

**GET** `/notifications/{id}`

Retrieves a specific notification by its ID.

### Update Notification

**PUT** `/notifications/{id}`

Updates an existing notification. Only sender or admin can update.

### Delete Notification

**DELETE** `/notifications/{id}`

Deletes a notification. Users can delete their own notifications or ones they created.

## Read/Unread Management

### Mark Notifications as Read

**PUT** `/notifications/mark-read`

Marks one or more notifications as read with device tracking.

#### Request Body

```json
{
  "notificationIds": ["id1", "id2"], // Optional - if empty, marks all as read
  "deviceInfo": {
    "deviceType": "mobile",
    "platform": "iOS",
    "ipAddress": "192.168.1.1"
  }
}
```

### Mark Notifications as Unread

**DELETE** `/notifications/mark-read`

Marks specified notifications as unread.

## Statistics & Analytics

### Get Notification Statistics

**GET** `/notifications/statistics`

Retrieves comprehensive notification analytics and engagement metrics.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | number | Days to include (1-365, default: 30) |
| `groupBy` | string | Group by day/week/month |
| `includeReadReceipts` | boolean | Include read receipt data |

#### Response

```json
{
  "success": true,
  "data": {
    "overview": {
      "total": 145,
      "unread": 23,
      "byType": {
        "assignment": 45,
        "class": 32,
        "fee": 15
      },
      "byPriority": {
        "critical": 2,
        "high": 15,
        "medium": 6
      }
    },
    "period": {
      "days": 30,
      "startDate": "2023-12-16T00:00:00Z",
      "endDate": "2024-01-15T00:00:00Z"
    },
    "analytics": [
      {
        "date": "2024-01-15",
        "total": 8,
        "read": 6,
        "unread": 2,
        "readRate": "75.00",
        "typeBreakdown": {...}
      }
    ],
    "engagement": {
      "readRate": "82.50",
      "averageReadTime": 15,
      "periodAnalysis": {...}
    }
  }
}
```

## Broadcast Notifications

### Send Broadcast Notification

**POST** `/notifications/broadcast`

Sends notifications to multiple recipients based on criteria.

#### Request Body

```json
{
  "title": "System Maintenance Notice",
  "message": "The system will be under maintenance tomorrow from 2-4 AM.",
  "type": "system",
  "priority": "high",
  "recipients": {
    "userIds": ["user1", "user2"],
    "roles": ["student", "teacher"],
    "classIds": ["class1", "class2"],
    "excludeUserIds": ["admin1"]
  },
  "deliveryChannels": ["in_app", "email"],
  "scheduledFor": "2024-01-16T08:00:00Z",
  "category": "system",
  "tags": ["maintenance", "important"]
}
```

### Get Broadcast Campaigns

**GET** `/notifications/broadcast`

Retrieves broadcast campaign history (Admin only).

## Bulk Operations

### Bulk Create Notifications

**POST** `/notifications/bulk`

Creates multiple notifications in a single request.

### Bulk Update Notifications

**PUT** `/notifications/bulk`

Updates multiple notifications matching criteria.

### Bulk Delete Notifications

**DELETE** `/notifications/bulk`

Deletes multiple notifications with confirmation.

## Notification Templates

### Get Available Templates

**GET** `/notifications/templates`

Retrieves all predefined notification templates.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by template category |
| `type` | string | Filter by notification type |

#### Response

```json
{
  "success": true,
  "data": {
    "templates": {
      "assignment": {
        "new_assignment": {
          "title": "New Assignment: {{assignmentTitle}}",
          "message": "A new {{subject}} assignment...",
          "type": "assignment",
          "priority": "medium",
          "actions": [...],
          "metadata": {
            "id": "assignment.new_assignment",
            "variables": ["assignmentTitle", "subject", "teacherName"],
            "usage": "high"
          }
        }
      }
    },
    "categories": ["assignment", "class", "fee", "system"],
    "totalTemplates": 25
  }
}
```

### Create Notification from Template

**POST** `/notifications/templates`

Creates notification(s) using a predefined template.

#### Request Body

```json
{
  "templateId": "assignment.new_assignment",
  "variables": {
    "assignmentTitle": "Calculus Problem Set 3",
    "subject": "Mathematics",
    "teacherName": "Prof. Smith",
    "dueDate": "Jan 20, 2024"
  },
  "recipients": {
    "classIds": ["class_123"],
    "roles": ["student"]
  },
  "overrides": {
    "priority": "high",
    "deliveryChannels": ["in_app", "email"]
  }
}
```

## Data Models

### Notification Model

```typescript
interface INotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  recipient: string;
  sender?: string;
  isRead: boolean;
  readReceipt?: {
    readAt: Date;
    deviceType?: string;
    platform?: string;
    ipAddress?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  scheduledFor?: Date;
  deliveryChannels: DeliveryChannel[];
  deliveryStatus: Record<string, DeliveryStatus>;
  imageUrl?: string;
  actions?: NotificationAction[];
  metadata?: NotificationMetadata;
  category?: string;
  tags?: string[];
  campaignId?: string;
}
```

### Notification Action

```typescript
interface NotificationAction {
  label: string;
  url: string;
  type: 'primary' | 'secondary';
}
```

### Notification Metadata

```typescript
interface NotificationMetadata {
  assignmentId?: string;
  classId?: string;
  doubtId?: string;
  feeId?: string;
  entityType?: string;
  entityId?: string;
  customData?: Record<string, any>;
}
```

## WebSocket Events

The notification system supports real-time updates via WebSocket:

### Client Events (Emit)

```typescript
// Subscribe to notifications
socket.emit('subscribe_notifications', { userId });

// Mark notification as read
socket.emit('mark_notification_read', { notificationId, deviceInfo });
```

### Server Events (Listen)

```typescript
// New notification received
socket.on('new_notification', (notification) => {
  // Handle new notification
});

// Notification updated
socket.on('notification_updated', ({ notificationId, updates }) => {
  // Handle notification update
});

// Bulk notifications marked as read
socket.on('notifications_read', ({ notificationIds, readCount }) => {
  // Handle bulk read status change
});
```

## Integration Examples

### Frontend Integration

```typescript
// Fetch user notifications
async function fetchNotifications(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/notifications?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

// Create notification
async function createNotification(notificationData) {
  const response = await fetch('/api/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(notificationData)
  });
  return response.json();
}

// Mark as read with device info
async function markAsRead(notificationIds, deviceInfo) {
  const response = await fetch('/api/notifications/mark-read', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ notificationIds, deviceInfo })
  });
  return response.json();
}
```

### Assignment Integration

```typescript
// Automatically create notification when assignment is created
export async function createAssignmentNotification(assignment, students) {
  const notificationData = {
    title: `New Assignment: ${assignment.title}`,
    message: `A new ${assignment.subject} assignment has been posted. Due: ${assignment.dueDate}`,
    type: 'assignment',
    priority: 'medium',
    deliveryChannels: ['in_app', 'email'],
    actions: [
      {
        label: 'View Assignment',
        url: `/assignments/${assignment.id}`,
        type: 'primary'
      }
    ],
    metadata: {
      assignmentId: assignment.id,
      customData: {
        subject: assignment.subject,
        dueDate: assignment.dueDate
      }
    },
    category: 'academic',
    tags: ['assignment', 'new']
  };

  // Create notification for each student
  const notifications = students.map(student => ({
    ...notificationData,
    recipient: student.id
  }));

  // Bulk create notifications
  return fetch('/api/notifications/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      notifications,
      campaignId: `assignment_${assignment.id}_${Date.now()}`
    })
  });
}
```

## Rate Limits

- Standard endpoints: 100 requests per minute per user
- Broadcast endpoints: 10 requests per minute per user
- Bulk operations: 20 requests per minute per user
- Statistics endpoints: 30 requests per minute per user

## Performance Considerations

- Use pagination for large notification lists
- Implement client-side caching for templates
- Use WebSocket for real-time updates instead of polling
- Consider read receipts for engagement analytics
- Use bulk operations for multiple notifications

## Error Codes

| Code | Description |
|------|-------------|
| `NOTIFICATION_NOT_FOUND` | Notification with specified ID not found |
| `INVALID_RECIPIENT` | Recipient user ID is invalid |
| `TEMPLATE_NOT_FOUND` | Notification template not found |
| `BROADCAST_LIMIT_EXCEEDED` | Too many recipients for broadcast |
| `BULK_OPERATION_LIMIT_EXCEEDED` | Too many items for bulk operation |
| `EXPIRED_NOTIFICATION` | Notification has expired |

This comprehensive API provides all the functionality needed for a robust notification management system in educational platforms.