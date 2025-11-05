// Email Service for notifications
const nodemailer = require('nodemailer');
const llmService = require('./llmService');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Send reminder email
  async sendReminderEmail(userEmail, reminderData) {
    try {
      const mailOptions = {
        from: `"College Event Tracker" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: `Reminder: ${reminderData.title}`,
        html: this.generateReminderEmailHTML(reminderData),
        text: this.generateReminderEmailText(reminderData)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Reminder email sent successfully to ${userEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error(`Failed to send reminder email to ${userEmail}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Send test email
  async sendTestEmail(userEmail) {
    try {
      const mailOptions = {
        from: `"College Event Tracker" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Test Email from College Event Tracker',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email from College Event Tracker.</p>
          <p>If you received this, your email settings are working correctly!</p>
          <br>
          <p>Best regards,<br>College Event Tracker Team</p>
        `,
        text: 'Test Email from College Event Tracker. If you received this, your email settings are working correctly!'
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Test email sent successfully to ${userEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error(`Failed to send test email to ${userEmail}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Generate HTML email content for reminders
  generateReminderEmailHTML(reminderData) {
    const eventDate = new Date(reminderData.eventDateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const eventTime = new Date(reminderData.eventDateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Event Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .event-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .priority-critical { border-left: 4px solid #ff4444; }
            .priority-high { border-left: 4px solid #ff8800; }
            .priority-medium { border-left: 4px solid #ffaa00; }
            .priority-low { border-left: 4px solid #44aa44; }
            .btn { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Event Reminder</h1>
              <p>You have an upcoming event that requires your attention</p>
            </div>

            <div class="content">
              <div class="event-card priority-${reminderData.priority || 'medium'}">
                <h2>${reminderData.title}</h2>

                <div style="margin: 15px 0;">
                  <p><strong>📅 Date:</strong> ${eventDate}</p>
                  <p><strong>⏰ Time:</strong> ${eventTime}</p>
                  <p><strong>📍 Location:</strong> ${reminderData.location || 'TBD'}</p>
                  <p><strong>🎯 Priority:</strong> ${this.getPriorityText(reminderData.priority)}</p>
                </div>

                ${reminderData.description ? `<p><strong>Description:</strong> ${reminderData.description}</p>` : ''}

                ${reminderData.customNote ? `<div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <strong>📝 Your Notes:</strong><br>
                  ${reminderData.customNote}
                </div>` : ''}

                ${reminderData.preparationTasks && reminderData.preparationTasks.length > 0 ? `
                  <div style="margin: 15px 0;">
                    <strong>✅ Preparation Tasks:</strong>
                    <ul>
                      ${reminderData.preparationTasks.map(task =>
                        `<li style="${task.completed ? 'text-decoration: line-through; color: #666;' : ''}">${task.task}</li>`
                      ).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/event/${reminderData.eventId}" class="btn">View Event Details</a>
                <a href="${process.env.FRONTEND_URL}/events" class="btn" style="background: #6c757d;">View All Events</a>
              </div>

              <p style="color: #666; font-size: 14px;">
                This reminder was sent ${reminderData.timeUntil} before your event.
                You can adjust your reminder preferences in your account settings.
              </p>
            </div>

            <div class="footer">
              <p>College Event Tracker | Powered by Your Event Hub</p>
              <p><a href="${process.env.FRONTEND_URL}/settings">Manage Notifications</a> | <a href="${process.env.FRONTEND_URL}/unsubscribe">Unsubscribe</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Generate plain text email content
  generateReminderEmailText(reminderData) {
    const eventDate = new Date(reminderData.eventDateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const eventTime = new Date(reminderData.eventDateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
COLLEGE EVENT TRACKER - EVENT REMINDER

${reminderData.title}

Date: ${eventDate}
Time: ${eventTime}
Location: ${reminderData.location || 'TBD'}
Priority: ${this.getPriorityText(reminderData.priority)}

${reminderData.description ? `Description: ${reminderData.description}` : ''}

${reminderData.customNote ? `Your Notes: ${reminderData.customNote}` : ''}

${reminderData.preparationTasks && reminderData.preparationTasks.length > 0 ?
  `Preparation Tasks:
${reminderData.preparationTasks.map(task => `- ${task.completed ? '[✓]' : '[ ]'} ${task.task}`).join('\n')}`
  : ''}

View Event: ${process.env.FRONTEND_URL}/event/${reminderData.eventId}

This reminder was sent ${reminderData.timeUntil} before your event.

---
College Event Tracker | Manage your notifications at ${process.env.FRONTEND_URL}/settings
    `.trim();
  }

  // Helper to convert priority number to text
  getPriorityText(priority) {
    switch (priority) {
      case 5: return 'CRITICAL';
      case 4: return 'HIGH';
      case 3: return 'MEDIUM';
      case 2: return 'LOW';
      case 1: return 'LOW';
      default: return 'MEDIUM';
    }
  }

  // Generate personalized email content using LLM
  async generatePersonalizedEmail(user, events, type = 'digest') {
    if (llmService.shouldUseLLM('email_content')) {
      try {
        const content = await llmService.generatePersonalizedEmail(user, events, type);
        return content;
      } catch (error) {
        console.error('LLM email generation failed, using template:', error);
      }
    }

    // Fallback to template-based generation
    return this.generateTemplateEmail(user, events, type);
  }

  // Template-based email generation (fallback)
  generateTemplateEmail(user, events, type) {
    const name = user.profile?.name || 'Student';
    const eventTitles = events.map(e => e.title).join(', ');

    switch (type) {
      case 'digest':
        return `Hi ${name},

Here are some upcoming events you might be interested in: ${eventTitles}

View your full dashboard at ${process.env.FRONTEND_URL}

Best regards,
College Event Tracker`;

      case 'reminder':
        return `Hi ${name},

Just a reminder about your upcoming event: ${eventTitles}

Don't forget to prepare!

Best regards,
College Event Tracker`;

      default:
        return `Hi ${name},

Check out these events: ${eventTitles}

Best regards,
College Event Tracker`;
    }
  }

  // Test email configuration
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connected successfully');
      return { success: true };
    } catch (error) {
      console.error('Email service connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
