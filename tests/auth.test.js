const request = require('supertest');
const { app } = require('../index');
const User = require('../src/models/user.model');
const tokenUtils = require('../src/utils/token');
const emailService = require('../src/utils/emailService');
const crypto = require('crypto');

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  role: 'user'
};

// Mock emailService to avoid actually sending emails during tests
jest.mock('../src/utils/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendApplicationNotification: jest.fn().mockResolvedValue(true)
}));

// Mock token utilities
jest.mock('../src/utils/token', () => {
  // Save original implementation
  const originalModule = jest.requireActual('../src/utils/token');
  
  return {
    ...originalModule, // Keep most original functions
    // Add tracking for token blacklist
    blacklistedTokens: new Set(),
    isTokenBlacklisted: jest.fn((token) => {
      return originalModule.isTokenBlacklisted(token);
    }),
    blacklistToken: jest.fn((token) => {
      return originalModule.blacklistToken(token);
    }),
    // Track actual token generation
    generateToken: jest.fn((payload) => {
      return originalModule.generateToken(payload);
    }),
    generateRefreshToken: jest.fn((userId) => {
      return originalModule.generateRefreshToken(userId);
    })
  };
});

describe('Auth API', () => {
  // Test user registration
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('name', testUser.name);
      expect(res.body.user).toHaveProperty('email', testUser.email);
      expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned
    });

    it('should not register user with existing email', async () => {
      // First create a user
      await User.create({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123'
      });

      // Try to register with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'existing@example.com',
          password: 'password456'
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No Email User',
          // Missing email
          password: 'password123'
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // Test user login
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user before each test
      const user = new User(testUser);
      await user.save();
    });

    it('should login user with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', testUser.email);
    });

    it('should not login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // Test get current user
  describe('GET /api/auth/me', () => {
    it('should get current user profile with valid token', async () => {
      // Create a test user
      const user = await User.create(testUser);
      const { token } = tokenUtils.generateToken({ id: user._id, role: user.role });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('should deny access without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // Test refresh token
  describe('POST /api/auth/refresh-token', () => {
    let user;
    let refreshTokenString;

    beforeEach(async () => {
      // Create a test user with refresh token
      user = await User.create(testUser);
      const { refreshToken } = tokenUtils.generateRefreshToken(user._id);
      refreshTokenString = refreshToken;
      
      // Store refresh token in user document
      user.refreshToken = refreshToken;
      user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await user.save();
    });

    it('should issue a new access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: refreshTokenString });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('expires');
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should require refresh token in request', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // Test forgot password
  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      // Create a test user
      await User.create(testUser);
      
      // Reset the mock before each test
      emailService.sendPasswordResetEmail.mockClear();
    });

    it('should send password reset email for existing user', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      
      // Verify user has reset token in database
      const updatedUser = await User.findOne({ email: testUser.email });
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetExpire).toBeDefined();
    });

    it('should still return success for non-existent email (security)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // Test reset password
  describe('PUT /api/auth/reset-password/:token', () => {
    let resetToken;
    let resetTokenHash;
    
    beforeEach(async () => {
      // Create a test user
      const user = await User.create(testUser);
      
      // Generate reset token
      resetToken = crypto.randomBytes(32).toString('hex');
      resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      // Save reset token to user
      user.passwordResetToken = resetTokenHash;
      user.passwordResetExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'newpassword456';
      
      const res = await request(app)
        .put(`/api/auth/reset-password/${resetToken}`)
        .send({ password: newPassword });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify password was changed and reset tokens were cleared
      const updatedUser = await User.findOne({ email: testUser.email }).select('+password');
      expect(updatedUser.passwordResetToken).toBeUndefined();
      expect(updatedUser.passwordResetExpire).toBeUndefined();
      
      // Check if we can login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: newPassword });
      
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });

    it('should reject invalid reset token', async () => {
      const res = await request(app)
        .put('/api/auth/reset-password/invalid-token')
        .send({ password: 'newpassword456' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject expired reset token', async () => {
      // Find user and expire the token
      const user = await User.findOne({ email: testUser.email });
      user.passwordResetExpire = new Date(Date.now() - 1000); // Expired 1 second ago
      await user.save();
      
      const res = await request(app)
        .put(`/api/auth/reset-password/${resetToken}`)
        .send({ password: 'newpassword456' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
  
  // Test logout
  describe('POST /api/auth/logout', () => {
    it('should successfully log out user', async () => {
      // Create a test user
      const user = await User.create(testUser);
      const { token } = tokenUtils.generateToken({ id: user._id, role: user.role });
      
      // Make sure the user has a refresh token to invalidate
      const { refreshToken } = tokenUtils.generateRefreshToken(user._id);
      user.refreshToken = refreshToken;
      user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.save();

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify user's refresh token was cleared
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.refreshToken).toBeUndefined();
      expect(updatedUser.refreshTokenExpiry).toBeUndefined();
      
      // Verify token was blacklisted
      expect(tokenUtils.blacklistToken).toHaveBeenCalledWith(token);
    });

    it('should fail without authentication', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
