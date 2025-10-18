# Live Classes Management System API Documentation

## Overview

The Live Classes Management System provides comprehensive APIs for managing virtual classrooms with real-time video conferencing, participant tracking, recording management, and detailed analytics.

## Features

### 🎥 Multi-Platform Video Conferencing
- **Supported Platforms**: Zoom, Microsoft Teams, Google Meet, Jitsi, WebEx
- **Real-time Session Management**: Start, end, join, leave functionality
- **Meeting URL Generation**: Automatic generation based on platform

### 👥 Advanced Participant Management
- **Role-Based Access**: Teacher, Student, Admin, Moderator roles
- **Real-time Tracking**: Join/leave times, session duration
- **Permissions System**: Granular controls for audio, video, chat, screen sharing
- **Capacity Management**: Configurable maximum participants

### 📊 Comprehensive Analytics
- **Class Statistics**: Completion rates, participation metrics
- **Platform Usage**: Distribution across video platforms
- **Daily Trends**: Historical data and insights
- **Session Analytics**: Duration, engagement metrics

### 🎬 Recording Management
- **Upload System**: Support for video/audio recordings
- **Access Control**: Public/private recordings with granular permissions
- **Metadata Tracking**: Duration, size, upload information
- **Secure Storage**: Role-based access to recordings

### 🔐 Security & Authentication
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Permissions**: Hierarchical access control
- **Data Filtering**: Sensitive information protection

## API Endpoints

### Main Live Classes Operations
```http
GET    /api/live-classes              # List classes with filtering
POST   /api/live-classes              # Create new class (supports bulk)
GET    /api/live-classes/[id]         # Get specific class details
PATCH  /api/live-classes/[id]         # Update class information
DELETE /api/live-classes/[id]         # Delete class
```

### Class Participation
```http
POST   /api/live-classes/[id]/join    # Join live class
POST   /api/live-classes/[id]/leave   # Leave live class
```

### Class Control (Teacher/Admin)
```http
POST   /api/live-classes/[id]/control # Start/End class
```

### Recording Management
```http
GET    /api/live-classes/[id]/recordings    # List recordings
POST   /api/live-classes/[id]/recordings    # Add new recording
```

### Analytics Dashboard
```http
GET    /api/live-classes/analytics          # Get comprehensive analytics
```

## Query Parameters

### Filtering (GET /api/live-classes)
- `page`: Page number (default: 1)
- `limit`: Items per page (max: 50, default: 10)
- `search`: Search in title/description
- `status`: Filter by class status (scheduled, live, ended, cancelled)
- `teacher`: Filter by teacher ID
- `platform`: Filter by video platform
- `type`: Filter by class type
- `subject`: Filter by subject
- `startDate`/`endDate`: Date range filtering
- `includeRecordings`: Include recording data
- `includeParticipants`: Include participant details

### Analytics Parameters
- `period`: Analysis period in days (default: 30)
- `teacherId`: Specific teacher analytics (admin only)

## Data Models

### Live Class Schema
```typescript
{
  title: string              // Class title
  description?: string       // Class description  
  teacher: ObjectId          // Teacher reference
  subject: string           // Subject/topic
  type: ClassType           // lecture, workshop, seminar, etc.
  platform: string         // Video conferencing platform
  scheduledStartTime: Date  // Scheduled start
  scheduledEndTime: Date    // Scheduled end
  actualStartTime?: Date    // Actual start time
  actualEndTime?: Date      // Actual end time
  status: LiveClassStatus   // scheduled, live, ended, cancelled
  isPublic: boolean         // Public accessibility
  maxParticipants?: number  // Capacity limit
  classId?: string          // Associated class/course
  allowedUsers: ObjectId[]  // Explicitly allowed users
  meetingId: string         // Platform meeting ID
  meetingUrl: string        // Join URL
  meetingPassword?: string  // Meeting password
  participants: Participant[] // Active participants
  recordings: Recording[]   // Class recordings
  tags: string[]           // Searchable tags
}
```

### Participant Schema
```typescript
{
  userId: ObjectId          // User reference
  role: ParticipantRole     // teacher, student, moderator
  joinedAt: Date           // Join timestamp
  leftAt?: Date            // Leave timestamp
  isActive: boolean        // Currently in class
  sessionDuration?: number  // Session length in seconds
  permissions: {
    canSpeak: boolean      // Audio permission
    canVideo: boolean      // Video permission
    canChat: boolean       // Chat permission
    canScreenShare: boolean // Screen sharing permission
  }
}
```

### Recording Schema
```typescript
{
  title: string            // Recording title
  url: string             // Storage URL
  type: RecordingType     // video, audio, screen
  duration: number        // Length in seconds
  size: number           // File size in bytes
  isPublic: boolean      // Public access
  accessAllowedTo: ObjectId[] // Specific user access
  uploadedAt: Date       // Upload timestamp
  uploadedBy: ObjectId   // Uploader reference
}
```

## Authentication

All endpoints require JWT authentication via:
- Cookie: `auth-token`
- Header: `Authorization: Bearer <token>`

## Error Handling

Standard HTTP status codes with consistent response format:
```json
{
  "success": boolean,
  "message": string,
  "data"?: any,
  "errors"?: ValidationError[]
}
```

## Usage Examples

### Create a Live Class
```javascript
POST /api/live-classes
{
  "title": "Advanced Mathematics",
  "description": "Calculus and derivatives",
  "subject": "Mathematics", 
  "type": "lecture",
  "platform": "zoom",
  "scheduledStartTime": "2024-01-15T10:00:00Z",
  "scheduledEndTime": "2024-01-15T11:30:00Z",
  "isPublic": false,
  "maxParticipants": 30
}
```

### Join a Class
```javascript
POST /api/live-classes/[id]/join
// Returns meeting URL and access credentials
```

### Start a Class (Teacher)
```javascript
POST /api/live-classes/[id]/control
{
  "action": "start"
}
```

### Get Analytics
```javascript
GET /api/live-classes/analytics?period=7&teacherId=123
// Returns comprehensive analytics for last 7 days
```

## Development Notes

### Database Indexes
- Compound index on teacher + scheduledStartTime for conflict detection
- Text indexes on title, description, subject for search
- TTL index on participants for cleanup

### Real-time Features
- WebSocket integration ready for live updates
- Participant tracking with session management
- Event-driven architecture support

### Scalability Considerations
- Pagination on all list endpoints
- Efficient queries with proper indexing
- Role-based data filtering
- Bulk operations support

### Security Features
- Input validation with Zod schemas  
- Role-based access control
- Sensitive data filtering
- Meeting password protection

## Future Enhancements

- WebSocket real-time updates
- Chat system integration
- Breakout room management
- Advanced recording processing
- Integration with LMS platforms
- Mobile app API support
- Webhook notifications
- Advanced scheduling features