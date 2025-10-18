# 🚀 SikshaLink Setup Guide

Welcome to SikshaLink! This comprehensive guide will help you set up the development environment for contributing to this modern learning management system as part of GSSoC 2025.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Verification](#verification)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🔧 Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

| Tool | Version | Purpose | Installation Link |
|------|---------|---------|-------------------|
| **Node.js** | v18+ | Runtime environment | [Download](https://nodejs.org/) |
| **pnpm** | v8+ | Package manager (faster than npm) | [Install](https://pnpm.io/installation) |
| **Git** | Latest | Version control | [Download](https://git-scm.com/) |
| **MongoDB** | v4.4+ | Database | [Install](https://www.mongodb.com/try/download/community) |

### Optional but Recommended

- **MongoDB Compass**: GUI for MongoDB management
- **VS Code**: Code editor with excellent TypeScript support
- **Postman**: API testing tool

### Verify Installation

```bash
# Check versions
node --version    # Should be v18+
pnpm --version    # Should be v8+
git --version     # Any recent version
mongod --version  # Should be v4.4+
```

## ⚡ Quick Start

If you're experienced with development, here's the fastest way to get started:

```bash
# 1. Clone the repository
git clone https://github.com/ratna-jaiswal/classroom-platform.git
cd classroom-platform

# 2. Install dependencies
pnpm install

# 3. Create environment file
cp .env.example .env.local  # Then edit with your values

# 4. Start MongoDB (if using local installation)
# Windows: net start MongoDB
# macOS: brew services start mongodb-community  
# Linux: sudo systemctl start mongod

# 5. Run the development server
pnpm dev

# 6. Visit http://localhost:3000
```

## 🔧 Detailed Setup

### Step 1: Clone the Repository

```bash
# Using HTTPS
git clone https://github.com/ratna-jaiswal/classroom-platform.git

# Or using SSH (if configured)
git clone git@github.com:ratna-jaiswal/classroom-platform.git

cd classroom-platform
```

### Step 2: Install Dependencies

SikshaLink uses `pnpm` for faster package management:

```bash
# Install all dependencies
pnpm install

# This will install:
# - Next.js 15.2.4 (React framework)
# - TypeScript 5.9.2 (Type safety)
# - Tailwind CSS 3.4.17 (Styling)
# - MongoDB/Mongoose (Database)
# - Authentication libraries (JWT, bcrypt)
# - UI components (@radix-ui)
# - And many more...
```

If you encounter issues with pnpm, you can also use npm:

```bash
npm install
```

## 🌍 Environment Configuration

### Create Environment File

Create a `.env.local` file in the root directory:

```bash
# Windows
copy .env.example .env.local

# macOS/Linux
cp .env.example .env.local
```

### Configure Environment Variables

Edit `.env.local` with your specific values:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/classroom-platform

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here-also-32-chars-min

# Optional: Email Configuration (for notifications)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password

# Optional: File Upload Configuration
UPLOAD_MAX_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES=pdf,doc,docx,png,jpg,jpeg
```

### Environment Variable Explanation

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGODB_URI` | Database connection string | `mongodb://localhost:27017/siksha` |
| `JWT_SECRET` | JWT token encryption key | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Application base URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | NextAuth.js encryption key | Generate with `openssl rand -base64 32` |

## 🗄️ Database Setup

### Option 1: Local MongoDB Installation

#### Windows
```bash
# Start MongoDB service
net start MongoDB

# Connect to verify
mongo
# or
mongosh
```

#### macOS
```bash
# Start MongoDB using Homebrew
brew services start mongodb-community

# Connect to verify
mongosh
```

#### Linux (Ubuntu/Debian)
```bash
# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod  # Auto-start on boot

# Connect to verify
mongosh
```

### Option 2: MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier available)
3. Create database user and get connection string
4. Update `MONGODB_URI` in `.env.local`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/classroom-platform?retryWrites=true&w=majority
```

### Option 3: Docker (Advanced)

```bash
# Run MongoDB in Docker container
docker run --name mongodb -p 27017:27017 -d mongo:latest

# Update MONGODB_URI
MONGODB_URI=mongodb://localhost:27017/classroom-platform
```

## 🚀 Running the Application

### Development Mode

```bash
# Start the development server
pnpm dev

# The application will be available at:
# http://localhost:3000
```

### Build for Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

### Additional Scripts

```bash
# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Run tests (if available)
pnpm test
```

## ✅ Verification

### 1. Application Access

- Open [http://localhost:3000](http://localhost:3000)
- You should see the SikshaLink homepage
- Navigation should work properly

### 2. API Endpoints

Test the API endpoints using curl or Postman:

```bash
# Health check
curl http://localhost:3000/api/health

# User registration (should return appropriate response)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","role":"student"}'
```

### 3. Database Connection

Check MongoDB connection:

```bash
# Connect to MongoDB
mongosh

# Switch to your database
use classroom-platform

# List collections (should show user collections after registration)
show collections
```

## 🔄 Development Workflow

### Git Workflow for Contributors

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/classroom-platform.git
   cd classroom-platform
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ratna-jaiswal/classroom-platform.git
   ```

4. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push and create pull request**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Development Best Practices

- Always create a new branch for each feature
- Follow the existing code style and conventions
- Write clear commit messages
- Test your changes thoroughly
- Update documentation when needed

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Issue: Port 3000 already in use
```bash
# Find process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Or use different port
pnpm dev -- --port 3001
```

#### Issue: MongoDB connection failed
- Ensure MongoDB is running
- Check connection string in `.env.local`
- Verify network connectivity (for Atlas)
- Check firewall settings

#### Issue: pnpm install fails
```bash
# Clear pnpm cache
pnpm store prune

# Delete node_modules and lock file
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

#### Issue: TypeScript errors
```bash
# Check TypeScript configuration
pnpm type-check

# Restart TypeScript service in VS Code
# Ctrl+Shift+P -> TypeScript: Restart TS Server
```

#### Issue: Environment variables not loading
- Ensure `.env.local` is in root directory
- Check for typos in variable names
- Restart development server after changes
- Verify file is not being ignored by git

### Getting Help

If you encounter issues:

1. Check existing [GitHub Issues](https://github.com/ratna-jaiswal/classroom-platform/issues)
2. Review [Contributing Guidelines](CONTRIBUTING.md)
3. Join the project Discord (link in README)
4. Create a new issue with detailed description

## 🤝 Contributing

Now that you have the setup working, you're ready to contribute!

### Areas for Contribution

1. **Backend Development** (High Priority)
   - Implement missing API endpoints
   - Add database models
   - Enhance authentication system

2. **Frontend Improvements**
   - UI/UX enhancements
   - Component development
   - Responsive design fixes

3. **Documentation**
   - API documentation
   - Code comments
   - User guides

4. **Testing**
   - Unit tests
   - Integration tests
   - End-to-end tests

### Next Steps

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines
2. Check [GSSoC specific guidelines](GSSOC.md)
3. Browse [open issues](https://github.com/ratna-jaiswal/classroom-platform/issues)
4. Join community discussions
5. Start with issues labeled `good first issue` or `gssoc2025`

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MongoDB Manual](https://www.mongodb.com/docs/manual/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)

## 🎯 Project Goals for GSSoC 2025

SikshaLink aims to become a comprehensive learning management system. Key objectives:

- ✅ Modern, responsive UI (Completed)
- 🔄 Complete backend API implementation (In Progress)
- 📱 Mobile-friendly design
- 🔐 Robust authentication system (Completed)
- 📊 Analytics and reporting features
- 🎥 Live class integration
- 📄 Document management system
- 🔔 Real-time notifications

---

**Happy Coding! 🚀**

*Made with ❤️ for GSSoC 2025*

For questions or support, please open an issue or contact the maintainers.