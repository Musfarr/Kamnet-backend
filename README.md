# Kamnet Marketplace Backend

A production-ready Node.js/Express API with MongoDB for the Kamnet Marketplace application, optimized for the Pakistani market.

## Features

- **Complete MVC Architecture**: Organized structure with Models, Views (API responses), and Controllers
- **Advanced Authentication**: JWT-based authentication with access and refresh tokens
- **Password Reset Flow**: Secure token-based password reset with email notifications
- **Token Security**: Token blacklisting for logout and token refresh mechanisms
- **Role-Based Access Control**: Different permissions for users, talents, and admins
- **MongoDB Integration**: Mongoose ODM with proper schema validation
- **RESTful API**: Complete API endpoints for tasks, applications, and user profiles
- **Error Handling**: Centralized error handling with detailed logging
- **Security**: Helmet integration, rate limiting, and password hashing
- **Logging**: Winston-based logging for production monitoring
- **Testing**: Comprehensive test suite with Jest and MongoDB memory server

## API Structure

- `/api/auth` - Authentication routes (login, register, Google OAuth)
- `/api/users` - User profile management
- `/api/talents` - Talent-specific operations and dashboard
- `/api/tasks` - Task posting, updating, and searching
- `/api/applications` - Task application management

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT and Google OAuth
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston
- **File Upload**: Multer

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- NPM or Yarn

### Installation

1. Clone the repository

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Copy the example .env file
cp .env.example .env

# Edit the .env file with your actual configuration
```

4. Start the development server
```bash
npm run dev
```

### Environment Variables

- `NODE_ENV`: Environment mode (development, production)
- `PORT`: Server port (default: 8000)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `JWT_EXPIRE`: JWT token expiration time (e.g., 30d)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID

## Deployment

### AWS Deployment

1. Install the AWS CLI and configure your credentials
2. Set up environment variables for production
3. Deploy using Elastic Beanstalk or EC2

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Deploy to Elastic Beanstalk
eb init
eb create
eb deploy
```

## Authentication System

### Enhanced Authentication Features

- **JWT Access & Refresh Tokens**: Dual token system for improved security
  - Access tokens with short expiry (15-30 minutes)
  - Refresh tokens with longer expiry (7-30 days)
  - Secure token storage and transmission

- **Password Reset Flow**:
  - Secure cryptographic token generation
  - Email delivery of reset links
  - Time-limited token expiration (10-30 minutes)
  - Proper validation and error handling

- **Token Security**:
  - Token blacklisting for logout
  - Automatic token refresh on expiration
  - Protection against token reuse and theft

- **Email Integration**:
  - Modular email service with provider switching
  - HTML email templates
  - Development mode with Ethereal email testing

## Testing Infrastructure

- **Jest Test Framework**: Complete test suite for all API endpoints
- **MongoDB Memory Server**: In-memory database for isolated testing
- **Mock Services**: Email and external service mocking
- **Environment Isolation**: Test-specific configuration and environment variables
- **Comprehensive Coverage**: Authentication, tasks, applications, and user operations

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/refresh-token` - Get new access token using refresh token
- `POST /api/auth/forgot-password` - Request password reset email
- `PUT /api/auth/reset-password/:token` - Reset password with valid token
- `POST /api/auth/logout` - Logout and invalidate tokens
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/google` - Authenticate with Google

## Next Steps

### Production Deployment

- **Environment Configuration**:
  - Set up production environment variables for JWT secrets and expiry times
  - Configure email service credentials for production (SendGrid/Mailgun)
  - Set up MongoDB Atlas production cluster with proper security settings

- **Performance Optimization**:
  - Implement Redis for token blacklisting (replacing in-memory storage)
  - Add database connection pooling for high traffic scenarios
  - Configure proper caching headers for static resources

- **Security Hardening**:
  - Set up HTTPS with proper SSL certificates
  - Implement IP-based rate limiting for sensitive endpoints
  - Add OWASP security headers and CSP policies
  - Configure automated security scanning

- **Monitoring & Logging**:
  - Set up centralized logging with ELK stack or similar
  - Implement performance monitoring with New Relic or PM2
  - Create alerts for security events and authentication failures
  - Set up uptime monitoring

### Feature Expansion

- **Payment Integration**:
  - Integrate with local Pakistani payment gateways
  - Implement escrow system for task payments
  - Add transaction history and reporting

- **Enhanced Search**:
  - Implement Elasticsearch for advanced task and talent search
  - Add geolocation-based search for local tasks

- **Real-time Features**:
  - Implement WebSockets for real-time notifications
  - Add chat functionality between talents and task posters

- **Analytics**:
  - Implement usage analytics and reporting
  - Add dashboard for admins with key metrics
  - Set up conversion and retention tracking

### User Endpoints

- `GET /api/users/:id` - Get user profile by ID
- `PUT /api/users/complete-profile` - Complete user profile
- `PUT /api/users` - Update user profile
- `DELETE /api/users` - Delete user account

### Talent Endpoints

- `GET /api/talents/:id` - Get talent profile by ID
- `GET /api/talents/applications` - Get talent's applications
- `GET /api/talents/dashboard` - Get talent dashboard stats
- `PUT /api/talents/profile` - Update talent profile

### Task Endpoints

- `POST /api/tasks` - Create a new task
- `GET /api/tasks` - Get all tasks (with filters)
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/me/tasks` - Get tasks created by user
- `GET /api/tasks/nearby` - Get nearby tasks

### Application Endpoints

- `POST /api/applications` - Create a new application
- `GET /api/applications/task/:taskId` - Get applications for a task
- `GET /api/applications/:id` - Get application by ID
- `PUT /api/applications/:id` - Update application status

## Frontend Integration

To connect the frontend to this backend, update the following environment variable in your frontend `.env` file:

```
REACT_APP_API_URL=http://localhost:8000
```

## License

This project is licensed under the ISC License.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
