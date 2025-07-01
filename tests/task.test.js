const request = require('supertest');
const { app } = require('../index');
const User = require('../src/models/user.model');
const Task = require('../src/models/task.model');
const jwt = require('jsonwebtoken');

describe('Task API', () => {
  let userToken;
  let userId;
  let taskId;

  // Sample task data
  const testTask = {
    title: 'Test Task',
    description: 'This is a test task description',
    budget: 5000,
    currency: 'PKR',
    location: 'Islamabad, Pakistan',
    category: 'Development',
    skills: ['JavaScript', 'Node.js'],
    deadlineDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    address: {
      street: 'Test Street',
      city: 'Islamabad',
      province: 'Federal Territory'
    },
    coordinates: {
      lat: 33.6844,
      lng: 73.0479
    }
  };

  // Before running tests, create a user and generate token
  beforeEach(async () => {
    // Create a test user
    const user = await User.create({
      name: 'Task User',
      email: 'taskuser@example.com',
      password: 'password123',
      role: 'user',
      profileCompleted: true
    });
    
    userId = user._id;
    
    // Generate token
    userToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );
    
    // Create a test task
    const task = await Task.create({
      ...testTask,
      user: userId
    });
    
    taskId = task._id;
  });

  // Test create task
  describe('POST /api/tasks', () => {
    it('should create a new task with valid data and authorization', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testTask);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('title', testTask.title);
      expect(res.body.data).toHaveProperty('user', userId.toString());
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Incomplete Task',
          // Missing required fields
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
    
    it('should not allow unauthorized access', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send(testTask);
      
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // Test get all tasks
  describe('GET /api/tasks', () => {
    it('should get all tasks', async () => {
      const res = await request(app)
        .get('/api/tasks');
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('count');
      expect(res.body.data.length).toBeGreaterThan(0);
    });
    
    it('should filter tasks by category', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .query({ category: 'Development' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      // All returned tasks should be in the Development category
      res.body.data.forEach(task => {
        expect(task.category).toBe('Development');
      });
    });
    
    it('should limit results when limit parameter is provided', async () => {
      // Create 5 more tasks
      for (let i = 0; i < 5; i++) {
        await Task.create({
          ...testTask,
          title: `Additional Task ${i}`,
          user: userId
        });
      }
      
      const limit = 3;
      const res = await request(app)
        .get('/api/tasks')
        .query({ limit });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(limit);
    });
  });

  // Test get single task
  describe('GET /api/tasks/:id', () => {
    it('should get a single task by id', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id', taskId.toString());
      expect(res.body.data).toHaveProperty('title', testTask.title);
    });
    
    it('should return 404 for non-existent task', async () => {
      // Generate a random but valid MongoDB ObjectId
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      const res = await request(app)
        .get(`/api/tasks/${nonExistentId}`);
      
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
    
    it('should return 400 for invalid task id', async () => {
      const res = await request(app)
        .get('/api/tasks/invalid-id');
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // Test update task
  describe('PUT /api/tasks/:id', () => {
    it('should update a task with valid data and authorization', async () => {
      const updatedData = {
        title: 'Updated Task Title',
        budget: 6000
      };
      
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('title', updatedData.title);
      expect(res.body.data).toHaveProperty('budget', updatedData.budget);
      
      // Original data should remain unchanged
      expect(res.body.data).toHaveProperty('description', testTask.description);
    });
    
    it('should not allow unauthorized access', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: 'Unauthorized Update' });
      
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
    
    it('should not allow users to update tasks they do not own', async () => {
      // Create another user
      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        role: 'user'
      });
      
      // Generate token for the new user
      const anotherToken = jwt.sign(
        { id: anotherUser._id, role: anotherUser.role },
        process.env.JWT_SECRET || 'testsecret',
        { expiresIn: '1h' }
      );
      
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ title: 'Not My Task' });
      
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // Test delete task
  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task with valid authorization', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify task no longer exists
      const verifyTask = await Task.findById(taskId);
      expect(verifyTask).toBeNull();
    });
    
    it('should not allow unauthorized access', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`);
      
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
