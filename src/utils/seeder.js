require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const Application = require('../models/application.model');
const connectDB = require('../config/db');
const { createLogger } = require('./logger');
const bcrypt = require('bcryptjs');

const logger = createLogger();

// Sample user data
const users = [
  {
    name: 'Admin User',
    email: 'admin@kamnet.pk',
    password: 'password123',
    role: 'admin',
    picture: 'https://randomuser.me/api/portraits/men/1.jpg',
    location: 'Islamabad, Pakistan',
    phone: '+923001234567',
    bio: 'Administrator for Kamnet Marketplace platform',
    profileCompleted: true
  },
  {
    name: 'Task Poster',
    email: 'user@kamnet.pk',
    password: 'password123',
    role: 'user',
    picture: 'https://randomuser.me/api/portraits/women/2.jpg',
    location: 'Lahore, Pakistan',
    phone: '+923001234568',
    bio: 'I post tasks and hire talents on Kamnet',
    profileCompleted: true
  },
  {
    name: 'Ahmed Talent',
    email: 'talent@kamnet.pk',
    password: 'password123',
    role: 'talent',
    picture: 'https://randomuser.me/api/portraits/men/3.jpg',
    location: 'Karachi, Pakistan',
    phone: '+923001234569',
    bio: 'Experienced web developer and designer based in Karachi',
    profileCompleted: true
  }
];

// Sample task data
const tasks = [
  {
    title: 'Build a WordPress Website',
    description: 'Need a professional to build a WordPress website for my small business. The website should include an about page, services, testimonials, and contact form.',
    budget: 15000,
    currency: 'PKR',
    location: 'Lahore, Pakistan',
    category: 'Development',
    skills: ['WordPress', 'PHP', 'Web Design', 'HTML', 'CSS'],
    deadlineDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    address: {
      street: 'MM Alam Road',
      city: 'Lahore',
      province: 'Punjab'
    },
    coordinates: {
      lat: 31.5204,
      lng: 74.3587
    },
    status: 'open'
  },
  {
    title: 'Logo Design for New Startup',
    description: 'Looking for a creative designer to create a modern logo for my tech startup. Need the final files in AI, PNG, and SVG formats.',
    budget: 8000,
    currency: 'PKR',
    location: 'Karachi, Pakistan',
    category: 'Design',
    skills: ['Logo Design', 'Adobe Illustrator', 'Branding'],
    deadlineDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    address: {
      street: 'Clifton',
      city: 'Karachi',
      province: 'Sindh'
    },
    coordinates: {
      lat: 24.8607,
      lng: 67.0011
    },
    status: 'open'
  },
  {
    title: 'Content Writing for Blog',
    description: 'Need articles written for my tech blog. Topics include latest mobile technologies, AI developments, and tech news in Pakistan.',
    budget: 5000,
    currency: 'PKR',
    location: 'Islamabad, Pakistan',
    category: 'Writing',
    skills: ['Content Writing', 'SEO', 'Technology'],
    deadlineDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    address: {
      street: 'F-7',
      city: 'Islamabad',
      province: 'Federal Territory'
    },
    coordinates: {
      lat: 33.6844,
      lng: 73.0479
    },
    status: 'open'
  }
];

// Sample application data
const createApplications = (tasks, talentId) => {
  return tasks.map(task => ({
    task: task._id,
    talent: talentId,
    coverLetter: `I am interested in your "${task.title}" project. I have extensive experience in ${task.category} and would love to help you complete this task on time and within budget.`,
    proposedBudget: task.budget * 0.9, // 10% discount
    currency: task.currency,
    estimatedCompletionTime: {
      value: 5,
      unit: 'days'
    },
    status: 'pending'
  }));
};

// Import data into DB
const importData = async () => {
  try {
    // Connect to DB
    await connectDB();
    
    // Clean existing data
    await User.deleteMany();
    await Task.deleteMany();
    await Application.deleteMany();
    
    logger.info('Database cleaned');
    
    // Create users with hashed passwords
    const createdUsers = [];
    for (const user of users) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      const createdUser = await User.create({
        ...user,
        password: hashedPassword
      });
      createdUsers.push(createdUser);
    }
    
    logger.info(`${createdUsers.length} users created`);
    
    // Find user and talent by role
    const userDoc = createdUsers.find(user => user.role === 'user');
    const talentDoc = createdUsers.find(user => user.role === 'talent');
    
    // Create tasks with the user id
    const taskData = tasks.map(task => ({
      ...task,
      user: userDoc._id
    }));
    
    const createdTasks = await Task.create(taskData);
    logger.info(`${createdTasks.length} tasks created`);
    
    // Create applications from the talent
    const applicationData = createApplications(createdTasks, talentDoc._id);
    const createdApplications = await Application.create(applicationData);
    logger.info(`${createdApplications.length} applications created`);
    
    // Update the task application counts
    for (const task of createdTasks) {
      const count = await Application.countDocuments({ task: task._id });
      await Task.findByIdAndUpdate(task._id, { applicationsCount: count });
    }
    
    logger.info('Data import successful!');
    process.exit(0);
  } catch (err) {
    logger.error(`Data import error: ${err.message}`);
    process.exit(1);
  }
};

// Delete all data from DB
const deleteData = async () => {
  try {
    // Connect to DB
    await connectDB();
    
    // Clean existing data
    await User.deleteMany();
    await Task.deleteMany();
    await Application.deleteMany();
    
    logger.info('All data deleted!');
    process.exit(0);
  } catch (err) {
    logger.error(`Data deletion error: ${err.message}`);
    process.exit(1);
  }
};

// Command line args
if (process.argv[2] === '-d') {
  deleteData();
} else {
  importData();
}
