const Event = require('../models/Event');
const User = require('../models/User');
const emailService = require('./emailService');
const recommendationService = require('./recommendationService');
const llmService = require('./llmService');

class EmailDigestService {
  // Send weekly digest to user
  async sendWeeklyDigest(userId) {
    const user = await User.findById(userId).populate('profile');
    if (!user) return;

    // Check user preferences
    if (user.preferences.notificationChannel === 'browser_push') {
      return; // User prefers push notifications only
    }

    // Generate digest content
    const digestData = await this.generateDigestContent(userId);

    if (digestData.events.length === 0 && digestData.recommendations.length === 0) {
      return; // No content to send
    }

    // Send email
    await this.sendDigestEmail(user, digestData);
  }

  // Generate digest content
  async generateDigestContent(userId) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get upcoming events
    const upcomingEvents = await Event.find({
      userId,
      status: 'scheduled',
      dateTime: { $gte: now, $lte: nextWeek }
    }).sort({ dateTime: 1 }).limit(10);

    // Get recommendations
    const recommendations = await recommendationService.getRecommendations(userId, 3);

    // Get recent activity
    const recentActivity = await this.getRecentActivity(userId);

    // Calculate stats
    const stats = await this.calculateWeeklyStats(userId);

    return {
      events: upcomingEvents,
      recommendations,
      activity: recentActivity,
      stats,
      digestDate: now
    };
  }

  // Get recent activity (last 7 days)
  async getRecentActivity(userId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentEvents = await Event.find({
      userId,
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 }).limit(5);

    const attendedEvents = await Event.find({
      userId,
      attended: true,
      updatedAt: { $gte: sevenDaysAgo }
    }).sort({ updatedAt: -1 }).limit(3);

    return {
      created: recentEvents,
      attended: attendedEvents
    };
  }

  // Calculate weekly statistics
  async calculateWeeklyStats(userId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const eventsCreated = await Event.countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo }
    });

    const eventsAttended = await Event.countDocuments({
      userId,
      attended: true,
      updatedAt: { $gte: sevenDaysAgo }
    });

    const totalUpcoming = await Event.countDocuments({
      userId,
      status: 'scheduled',
      dateTime: { $gte: new Date() }
    });

    return {
      eventsCreated,
      eventsAttended,
      totalUpcoming,
      weekStart: sevenDaysAgo
    };
  }

  // Send digest email
  async sendDigestEmail(user, digestData) {
    const subject = `Your College Event Hub Digest - Week of ${digestData.digestDate.toLocaleDateString()}`;

    // Use LLM-enhanced content generation if available
    let htmlContent, textContent;
    if (llmService.shouldUseLLM('email_content')) {
      try {
        const llmContent = await llmService.generatePersonalizedEmail(user, digestData.events.slice(0, 3), 'digest');
        // For LLM-generated content, create simple HTML wrapper
        htmlContent = this.wrapLLMContent(llmContent, digestData);
        textContent = llmContent;
      } catch (error) {
        console.error('LLM email generation failed, using template:', error);
        ({ htmlContent, textContent } = this.generateTemplateDigest(user, digestData));
      }
    } else {
      ({ htmlContent, textContent } = this.generateTemplateDigest(user, digestData));
    }

    // Use existing email service
    await emailService.sendEmail({
      to: user.email,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  // Generate HTML digest content
  generateDigestHTML(user, digestData) {
    const { events, recommendations, activity, stats } = digestData;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Weekly Event Digest</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .event { margin: 10px 0; padding: 10px; background: #f9f9f9; }
            .stats { display: flex; justify-content: space-around; background: #e3f2fd; padding: 10px; }
            .stat-item { text-align: center; }
            .priority-high { border-left: 4px solid #f44336; }
            .priority-medium { border-left: 4px solid #ff9800; }
            .priority-low { border-left: 4px solid #4caf50; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Your College Event Hub Digest</h1>
              <p>Hello ${user.profile.name}!</p>
            </div>

            <div class="section">
              <h2>📊 This Week's Stats</h2>
              <div class="stats">
                <div class="stat-item">
                  <strong>${stats.eventsCreated}</strong><br>
                  Events Created
                </div>
                <div class="stat-item">
                  <strong>${stats.eventsAttended}</strong><br>
                  Events Attended
                </div>
                <div class="stat-item">
                  <strong>${stats.totalUpcoming}</strong><br>
                  Upcoming Events
                </div>
              </div>
            </div>

            ${events.length > 0 ? `
            <div class="section">
              <h2>🎯 Upcoming Events</h2>
              ${events.map(event => `
                <div class="event priority-${event.priority === 5 ? 'high' : event.priority >= 3 ? 'medium' : 'low'}">
                  <h3>${event.title}</h3>
                  <p><strong>📅</strong> ${event.dateTime.toLocaleDateString()} at ${event.dateTime.toLocaleTimeString()}</p>
                  <p><strong>📍</strong> ${event.location || 'TBD'}</p>
                  <p><strong>🏷️</strong> ${event.category}</p>
                  ${event.description ? `<p>${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>` : ''}
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${recommendations.length > 0 ? `
            <div class="section">
              <h2>💡 Recommended for You</h2>
              ${recommendations.map(rec => `
                <div class="event">
                  <h3>${rec.title}</h3>
                  <p><strong>📅</strong> ${rec.dateTime.toLocaleDateString()}</p>
                  <p><strong>🏷️</strong> ${rec.category}</p>
                  <p><em>${rec.reason}</em></p>
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${activity.attended.length > 0 ? `
            <div class="section">
              <h2>✅ Recent Attendance</h2>
              ${activity.attended.map(event => `
                <div class="event">
                  <p><strong>${event.title}</strong> - Attended on ${event.updatedAt.toLocaleDateString()}</p>
                </div>
              `).join('')}
            </div>
            ` : ''}

            <div class="section">
              <p>Stay organized and never miss an event! 🎓</p>
              <p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">View Full Dashboard</a> |
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings">Update Preferences</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Wrap LLM-generated content in HTML
  wrapLLMContent(llmContent, digestData) {
    const { events, stats } = digestData;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Weekly Event Digest</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .stats { display: flex; justify-content: space-around; background: #e3f2fd; padding: 10px; }
            .stat-item { text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Your College Event Hub Digest</h1>
              <p>AI-Personalized Weekly Summary</p>
            </div>

            <div class="section">
              <h2>📊 This Week's Stats</h2>
              <div class="stats">
                <div class="stat-item">
                  <strong>${stats.eventsCreated}</strong><br>
                  Events Created
                </div>
                <div class="stat-item">
                  <strong>${stats.eventsAttended}</strong><br>
                  Events Attended
                </div>
                <div class="stat-item">
                  <strong>${stats.totalUpcoming}</strong><br>
                  Upcoming Events
                </div>
              </div>
            </div>

            <div class="section">
              <h2>🤖 AI-Generated Summary</h2>
              <div style="white-space: pre-line; line-height: 1.6;">
                ${llmContent.replace(/\n/g, '<br>')}
              </div>
            </div>

            <div class="section">
              <p>Stay organized and never miss an event! 🎓</p>
              <p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">View Full Dashboard</a> |
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings">Update Preferences</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Generate template digest (fallback)
  generateTemplateDigest(user, digestData) {
    const htmlContent = this.generateDigestHTML(user, digestData);
    const textContent = this.generateDigestText(user, digestData);

    return { htmlContent, textContent };
  }
  generateDigestHTML(user, digestData) {
    const { events, recommendations, activity, stats } = digestData;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Weekly Event Digest</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .event { margin: 10px 0; padding: 10px; background: #f9f9f9; }
            .stats { display: flex; justify-content: space-around; background: #e3f2fd; padding: 10px; }
            .stat-item { text-align: center; }
            .priority-high { border-left: 4px solid #f44336; }
            .priority-medium { border-left: 4px solid #ff9800; }
            .priority-low { border-left: 4px solid #4caf50; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Your College Event Hub Digest</h1>
              <p>Hello ${user.profile.name}!</p>
            </div>

            <div class="section">
              <h2>📊 This Week's Stats</h2>
              <div class="stats">
                <div class="stat-item">
                  <strong>${stats.eventsCreated}</strong><br>
                  Events Created
                </div>
                <div class="stat-item">
                  <strong>${stats.eventsAttended}</strong><br>
                  Events Attended
                </div>
                <div class="stat-item">
                  <strong>${stats.totalUpcoming}</strong><br>
                  Upcoming Events
                </div>
              </div>
            </div>

            ${events.length > 0 ? `
            <div class="section">
              <h2>🎯 Upcoming Events</h2>
              ${events.map(event => `
                <div class="event priority-${event.priority === 5 ? 'high' : event.priority >= 3 ? 'medium' : 'low'}">
                  <h3>${event.title}</h3>
                  <p><strong>📅</strong> ${event.dateTime.toLocaleDateString()} at ${event.dateTime.toLocaleTimeString()}</p>
                  <p><strong>📍</strong> ${event.location || 'TBD'}</p>
                  <p><strong>🏷️</strong> ${event.category}</p>
                  ${event.description ? `<p>${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>` : ''}
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${recommendations.length > 0 ? `
            <div class="section">
              <h2>💡 Recommended for You</h2>
              ${recommendations.map(rec => `
                <div class="event">
                  <h3>${rec.title}</h3>
                  <p><strong>📅</strong> ${rec.dateTime.toLocaleDateString()}</p>
                  <p><strong>🏷️</strong> ${rec.category}</p>
                  <p><em>${rec.reason}</em></p>
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${activity.attended.length > 0 ? `
            <div class="section">
              <h2>✅ Recent Attendance</h2>
              ${activity.attended.map(event => `
                <div class="event">
                  <p><strong>${event.title}</strong> - Attended on ${event.updatedAt.toLocaleDateString()}</p>
                </div>
              `).join('')}
            </div>
            ` : ''}

            <div class="section">
              <p>Stay organized and never miss an event! 🎓</p>
              <p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">View Full Dashboard</a> |
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings">Update Preferences</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Generate text digest content
  generateDigestText(user, digestData) {
    const { events, recommendations, stats } = digestData;

    let text = `Hi ${user.profile.name},

Your College Event Hub Digest - Week of ${digestData.digestDate.toLocaleDateString()}

📊 This Week's Stats:
- Events Created: ${stats.eventsCreated}
- Events Attended: ${stats.eventsAttended}
- Total Upcoming: ${stats.totalUpcoming}

`;

    if (events.length > 0) {
      text += `🎯 Upcoming Events:
${events.map(event => `- ${event.title} (${event.dateTime.toLocaleDateString()} ${event.dateTime.toLocaleTimeString()})`).join('\n')}

`;
    }

    if (recommendations.length > 0) {
      text += `💡 Recommended for You:
${recommendations.map(rec => `- ${rec.title} (${rec.reason})`).join('\n')}

`;
    }

    text += `View your full dashboard: ${process.env.FRONTEND_URL || 'http://localhost:5173'}

Stay organized! 🎓
College Event Tracker`;

    return text;
  }

  // Send digest to all users (batch job)
  async sendBatchDigest() {
    try {
      // Get users who want email digests
      const users = await User.find({
        'preferences.notificationChannel': { $in: ['email', 'both'] }
      }).select('_id email profile.name');

      console.log(`Sending digest to ${users.length} users`);

      for (const user of users) {
        try {
          await this.sendWeeklyDigest(user._id);
          // Small delay to avoid overwhelming email service
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to send digest to ${user.email}:`, error);
        }
      }

      console.log('Batch digest completed');
    } catch (error) {
      console.error('Batch digest failed:', error);
    }
  }

  // Schedule weekly digest (would be called by cron job)
  async scheduleWeeklyDigest() {
    // This would be set up as a cron job, e.g., every Monday at 9 AM
    // For now, just log that it would be scheduled
    console.log('Weekly digest scheduler initialized');
  }
}

module.exports = new EmailDigestService();
