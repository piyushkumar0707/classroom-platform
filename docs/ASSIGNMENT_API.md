# Assignment Management API Documentation

This document provides comprehensive documentation for the Assignment Management API endpoints in the classroom platform.

## Table of Contents

1. [Authentication](#authentication)
2. [Base URLs](#base-urls)
3. [Error Handling](#error-handling)
4. [Assignments API](#assignments-api)
5. [Submissions API](#submissions-api)
6. [Statistics API](#statistics-api)
7. [Import/Export API](#importexport-api)
8. [Data Models](#data-models)

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Role-based Access Control

- **Admin**: Full access to all assignments and administrative functions
- **Teacher**: Can create, manage, and grade assignments they created
- **Student**: Can view published assignments and submit their work

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

## Assignments API

### List Assignments

**GET** `/assignments`

Retrieves a paginated list of assignments based on filters and user permissions.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 10 | Number of items per page (max 50) |
| `subject` | string | - | Filter by subject |
| `class` | string | - | Filter by class ID |
| `type` | string | - | Filter by assignment type |
| `status` | string | - | Filter by status (published/draft/overdue) |
| `search` | string | - | Search in title and description |
| `sortBy` | string | createdAt | Sort field (createdAt/dueDate/title) |
| `sortOrder` | string | desc | Sort order (asc/desc) |

#### Response

```json
{
  "success": true,
  "message": "Assignments fetched successfully",
  "data": {
    "assignments": [
      {
        "id": "assignment_id",
        "title": "Assignment Title",
        "description": "Assignment description",
        "subject": "mathematics",
        "type": "homework",
        "maxMarks": 100,
        "dueDate": "2024-01-15T10:00:00.000Z",
        "isPublished": true,
        "submissionsAllowed": true,
        "createdBy": {
          "name": "Teacher Name",
          "email": "teacher@example.com"
        },
        "class": {
          "name": "Class 10A",
          "code": "10A-2024"
        },
        "submissionStats": {
          "total": 25,
          "graded": 15
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Create Assignment

**POST** `/assignments`

Creates a new assignment. Only teachers and admins can create assignments.

#### Request Body

```json
{
  "title": "New Assignment Title",
  "description": "Detailed description of the assignment",
  "instructions": "Step-by-step instructions (optional)",
  "subject": "mathematics",
  "dueDate": "2024-01-15T10:00:00.000Z",
  "maxMarks": 100,
  "type": "homework",
  "class": "class_id",
  "attachments": ["https://example.com/file1.pdf"],
  "isPublished": false,
  "submissionsAllowed": true,
  "lateSubmissionAllowed": false,
  "rubric": [
    {
      "criteria": "Problem Solving",
      "maxPoints": 40,
      "description": "Accuracy of mathematical solutions"
    }
  ]
}
```

### Get Assignment by ID

**GET** `/assignments/{id}`

Retrieves a specific assignment by its ID.

#### Response

```json
{
  "success": true,
  "message": "Assignment fetched successfully",
  "data": {
    "id": "assignment_id",
    "title": "Assignment Title",
    "description": "Assignment description",
    "instructions": "Detailed instructions",
    "subject": "mathematics",
    "type": "homework",
    "maxMarks": 100,
    "dueDate": "2024-01-15T10:00:00.000Z",
    "isPublished": true,
    "submissionsAllowed": true,
    "lateSubmissionAllowed": false,
    "attachments": ["https://example.com/file1.pdf"],
    "rubric": [...],
    "createdBy": {...},
    "class": {...},
    "submissions": [...] // Only for teachers/admins
  }
}
```

### Update Assignment

**PUT** `/assignments/{id}`

Updates an existing assignment. Only the creator or admin can update.

#### Request Body

Same structure as create assignment, with optional fields.

### Delete Assignment

**DELETE** `/assignments/{id}`

Deletes an assignment. Only the creator or admin can delete. Assignments with submissions cannot be deleted unless forced.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `force` | boolean | Force delete even with submissions |

## Submissions API

### List Assignment Submissions

**GET** `/assignments/{id}/submissions`

Retrieves submissions for a specific assignment.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `student` | string | Filter by student ID |
| `isGraded` | boolean | Filter by grading status |
| `isLate` | boolean | Filter by late submissions |
| `sortBy` | string | Sort field |
| `sortOrder` | string | Sort order |

### Submit Assignment

**POST** `/assignments/{id}/submissions`

Submit an assignment solution. Only students can submit.

#### Request Body

```json
{
  "content": "Solution text or description",
  "attachments": ["https://example.com/submission.pdf"]
}
```

### Grade Submission

**PUT** `/assignments/{id}/submissions/{submissionId}`

Grade a student's submission. Only teachers and admins can grade.

#### Request Body

```json
{
  "marks": 85,
  "feedback": "Good work! Consider improving the mathematical notation."
}
```

### Delete Submission

**DELETE** `/assignments/{id}/submissions/{submissionId}`

Delete a submission. Students can delete ungraded submissions, teachers can delete any.

## Statistics API

### Get Assignment Statistics

**GET** `/assignments/statistics`

Retrieves comprehensive assignment statistics and analytics.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `classId` | string | Filter by class |
| `teacherId` | string | Filter by teacher (admin only) |
| `period` | number | Days to include (default: 30) |

#### Response

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalAssignments": 45,
      "publishedAssignments": 40,
      "draftAssignments": 5,
      "totalSubmissions": 1200,
      "gradedSubmissions": 900,
      "averageScore": 78.5,
      "submissionRate": 85.2,
      "gradingProgress": 75.0
    },
    "distributions": {
      "gradeDistribution": {
        "excellent": 120,
        "good": 280,
        "average": 350,
        "poor": 100,
        "fail": 50
      },
      "typeDistribution": {
        "homework": 25,
        "quiz": 10,
        "project": 8,
        "exam": 2
      }
    },
    "trends": {
      "recentActivity": [...],
      "submissionsByDate": [...]
    },
    "topPerforming": [...],
    "overdue": [...]
  }
}
```

## Import/Export API

### Import Assignments

**POST** `/assignments/import-export`

Import assignments from JSON or CSV data.

#### Request Body

```json
{
  "assignments": [...],
  "format": "json",
  "options": {
    "autoPublish": false
  }
}
```

### Export Assignments

**GET** `/assignments/import-export`

Export assignments to JSON or CSV format.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | Export format (json/csv) |
| `includeSubmissions` | boolean | Include submission data |
| `classId` | string | Filter by class |
| `subject` | string | Filter by subject |
| `startDate` | string | Start date filter |
| `endDate` | string | End date filter |

## Data Models

### Assignment Model

```typescript
interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  subject: string;
  type: 'homework' | 'quiz' | 'project' | 'exam' | 'lab' | 'other';
  maxMarks: number;
  dueDate: Date;
  class?: string;
  createdBy: string;
  attachments: string[];
  isPublished: boolean;
  submissionsAllowed: boolean;
  lateSubmissionAllowed: boolean;
  rubric: RubricCriteria[];
  submissions: Submission[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Submission Model

```typescript
interface Submission {
  id: string;
  student: string;
  content: string;
  attachments: string[];
  submittedAt: Date;
  isLate: boolean;
  marks?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
}
```

### Rubric Criteria

```typescript
interface RubricCriteria {
  criteria: string;
  maxPoints: number;
  description?: string;
}
```

## Rate Limits

- Standard endpoints: 100 requests per minute per user
- Import/Export endpoints: 10 requests per minute per user
- Statistics endpoints: 20 requests per minute per user

## Pagination

All list endpoints support pagination with the following parameters:
- `page`: Page number (1-based)
- `limit`: Items per page (max varies by endpoint)

## Validation

All input data is validated using Zod schemas. Common validation rules:
- Required fields must be present
- String lengths are enforced
- Date formats must be valid ISO strings
- ObjectIds must be valid MongoDB ObjectIds
- Email addresses must be valid
- URLs must be properly formatted

## Error Codes

| Code | Description |
|------|-------------|
| `ASSIGNMENT_NOT_FOUND` | Assignment with specified ID not found |
| `SUBMISSION_NOT_FOUND` | Submission with specified ID not found |
| `PERMISSION_DENIED` | User lacks permission for this action |
| `VALIDATION_ERROR` | Input data validation failed |
| `DUPLICATE_SUBMISSION` | Student already submitted this assignment |
| `LATE_SUBMISSION_NOT_ALLOWED` | Late submissions not permitted |
| `GRADED_SUBMISSION_CANNOT_DELETE` | Cannot delete graded submission |

## Examples

### Creating an Assignment

```bash
curl -X POST "http://localhost:3000/api/assignments" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quadratic Equations Practice",
    "description": "Solve various quadratic equations using different methods",
    "subject": "mathematics",
    "dueDate": "2024-01-20T23:59:59.000Z",
    "maxMarks": 50,
    "type": "homework",
    "class": "60d5f484f85b5c001f8c4567"
  }'
```

### Submitting an Assignment

```bash
curl -X POST "http://localhost:3000/api/assignments/60d5f484f85b5c001f8c4567/submissions" \
  -H "Authorization: Bearer student-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Solutions to all problems are attached in the PDF file",
    "attachments": ["https://example.com/my-solutions.pdf"]
  }'
```

### Getting Statistics

```bash
curl -X GET "http://localhost:3000/api/assignments/statistics?period=7&classId=60d5f484f85b5c001f8c4567" \
  -H "Authorization: Bearer teacher-jwt-token"
```

This API provides a complete assignment management system with robust authentication, validation, and comprehensive features for educational platforms.