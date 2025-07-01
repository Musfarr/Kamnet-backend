const nodemailer = require('nodemailer');
const { createLogger } = require('./logger');

const logger = createLogger();

/**
 * Email service for sending transactional emails
 */
class EmailService {
  constructor() {
    // Create reusable transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else {
      // For development, use Ethereal (fake SMTP service)
      this.createDevTransport();
    }
  }

  /**
   * Create a development email transport using Ethereal
   */
  async createDevTransport() {
    try {
      // Generate test account for development
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      logger.info(`Development email configured with Ethereal: ${testAccount.user}`);
    } catch (error) {
      logger.error('Failed to create development email transport:', error);
    }
  }

  /**
   * Send email
   * 
   * @param {Object} options - Email options
   * @param {String} options.to - Recipient email
   * @param {String} options.subject - Email subject
   * @param {String} options.text - Plain text email content
   * @param {String} options.html - HTML email content
   * @returns {Promise} - Email sending result
   */
  async sendEmail(options) {
    try {
      const { to, subject, text, html } = options;

      // Setup email data
      const mailOptions = {
        from: `Kamnet Marketplace <${process.env.EMAIL_FROM || 'noreply@kamnet.pk'}>`,
        to,
        subject,
        text,
        html: html || text
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV !== 'production') {
        // Log preview URL in development
        logger.info(`Email sent: ${info.messageId}`);
        logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      } else {
        logger.info(`Email sent to ${to}: ${subject}`);
      }

      return info;
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      throw new Error('Email could not be sent');
    }
  }

  /**
   * Send welcome email to new users
   * 
   * @param {Object} user - User object with name and email
   * @returns {Promise} - Email sending result
   */
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Kamnet Marketplace!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Kamnet Marketplace, ${user.name}!</h2>
          <p>Thank you for joining Pakistan's local service marketplace. We're excited to have you on board!</p>
          <p>With Kamnet, you can:</p>
          <ul>
            <li>Post tasks and find talented professionals</li>
            <li>Browse available tasks in your area</li>
            <li>Build your professional profile</li>
          </ul>
          <p>Get started by <a href="${process.env.FRONTEND_URL || 'https://kamnet.pk'}">logging into your account</a>.</p>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Best regards,<br>The Kamnet Team</p>
        </div>
      `
    });
  }

  /**
   * Send password reset email
   * 
   * @param {Object} options - Password reset options
   * @param {String} options.email - User's email
   * @param {String} options.token - Reset token
   * @param {String} options.name - User's name
   * @returns {Promise} - Email sending result
   */
  async sendPasswordResetEmail({ email, token, name }) {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://kamnet.pk'}/reset-password/${token}`;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello, ${name}</h2>
          <p>You requested a password reset for your Kamnet account.</p>
          <p>Please click the link below to reset your password. This link will expire in 10 minutes.</p>
          <p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              Reset Password
            </a>
          </p>
          <p>If you did not request this password reset, please ignore this email or contact our support team if you have concerns.</p>
          <p>Best regards,<br>The Kamnet Team</p>
        </div>
      `
    });
  }

  /**
   * Send task application notification to task owner
   * 
   * @param {Object} options - Notification options
   * @param {String} options.ownerEmail - Task owner's email
   * @param {String} options.ownerName - Task owner's name
   * @param {String} options.taskTitle - Task title
   * @param {String} options.applicantName - Applicant's name
   * @param {String} options.taskId - Task ID for generating URL
   * @returns {Promise} - Email sending result
   */
  async sendApplicationNotification({ ownerEmail, ownerName, taskTitle, applicantName, taskId }) {
    const taskUrl = `${process.env.FRONTEND_URL || 'https://kamnet.pk'}/tasks/${taskId}`;

    return this.sendEmail({
      to: ownerEmail,
      subject: `New application for "${taskTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello, ${ownerName}</h2>
          <p>Good news! <strong>${applicantName}</strong> has applied for your task: <strong>${taskTitle}</strong>.</p>
          <p>Log in to your account to review their application and qualifications.</p>
          <p>
            <a href="${taskUrl}" style="display: inline-block; background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              View Application
            </a>
          </p>
          <p>Best regards,<br>The Kamnet Team</p>
        </div>
      `
    });
  }
}

module.exports = new EmailService();
