const { google } = require('googleapis');
const Event = require('../models/Event');
const User = require('../models/User');

class EmailIntegrationService {
  constructor() {
    this.gmail = google.gmail({ version: 'v1' });
  }

  // Connect Gmail account
  async connectGmail(userId, authCode) {
    const oauth2Client = this._getOAuth2Client();

    try {
      const { tokens } = await oauth2Client.getToken(authCode);
      oauth2Client.setCredentials(tokens);

      // Store tokens
      await User.findByIdAndUpdate(userId, {
        'integrations.emailIntegration.gmailConnected': true,
        'integrations.emailIntegration.accessToken': tokens.access_token,
        'integrations.emailIntegration.refreshToken': tokens.refresh_token
      });

      return { success: true, message: 'Gmail connected successfully' };
    } catch (error) {
      throw new Error('Failed to connect Gmail: ' + error.message);
    }
  }

  // Scan emails for events
  async scanEmailsForEvents(userId) {
    const user = await User.findById(userId);
    if (!user.integrations.emailIntegration.gmailConnected) {
      throw new Error('Gmail not connected');
    }

    const oauth2Client = this._getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: user.integrations.emailIntegration.accessToken,
      refresh_token: user.integrations.emailIntegration.refreshToken
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    try {
      const query = this._buildEmailQuery(user.integrations.emailIntegration.emailFilters);
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50
      });

      const messages = response.data.messages || [];
      const importedEvents = [];

      for (const message of messages) {
        const eventData = await this._processEmailMessage(message.id, userId);
        if (eventData) {
          importedEvents.push(eventData);
        }
      }

      // Update user's imported count
      await User.findByIdAndUpdate(userId, {
        $inc: { 'integrations.emailIntegration.importedEventCount': importedEvents.length },
        'integrations.emailIntegration.lastScanDate': new Date()
      });

      return {
        importedCount: importedEvents.length,
        events: importedEvents
      };
    } catch (error) {
      throw new Error('Failed to scan emails: ' + error.message);
    }
  }

  // Process individual email message
  async _processEmailMessage(messageId, userId) {
    try {
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const emailBody = this._extractEmailBody(message.data);
      const extractedEvent = await this._extractEventFromEmail(emailBody);

      if (extractedEvent && extractedEvent.confidence > 0.75) {
        // Check if event already exists
        const existingEvent = await Event.findOne({
          userId,
          title: extractedEvent.title,
          dateTime: {
            $gte: new Date(extractedEvent.dateTime.getTime() - 3600000), // 1 hour window
            $lte: new Date(extractedEvent.dateTime.getTime() + 3600000)
          }
        });

        if (!existingEvent) {
          const event = new Event({
            userId,
            title: extractedEvent.title,
            description: extractedEvent.description,
            dateTime: extractedEvent.dateTime,
            location: extractedEvent.location,
            category: extractedEvent.category || 'academic',
            sourceType: 'email_import',
            extractionMethod: 'email_parser',
            extractionConfidence: extractedEvent.confidence,
            rawInput: emailBody
          });

          await event.save();

          // Notify user (implement notification service)
          // await notificationService.notifyUser(userId, `Event imported from email: ${extractedEvent.title}`);

          return event;
        }
      }
    } catch (error) {
      console.error('Error processing email message:', error);
    }
    return null;
  }

  // Extract email body from Gmail message
  _extractEmailBody(message) {
    const parts = message.payload.parts || [];
    for (const part of parts) {
      if (part.mimeType === 'text/plain') {
        return Buffer.from(part.body.data, 'base64').toString();
      }
    }
    return '';
  }

  // Extract event from email (simplified - in real app use Claude API)
  async _extractEventFromEmail(emailBody) {
    // This is a simplified version. In production, use Claude API or similar
    // For now, mock extraction
    const titleMatch = emailBody.match(/(?:event|workshop|competition):\s*([^\n]+)/i);
    const dateMatch = emailBody.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
    const timeMatch = emailBody.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
    const locationMatch = emailBody.match(/location:\s*([^\n]+)/i);

    if (titleMatch && dateMatch) {
      const title = titleMatch[1].trim();
      const dateStr = dateMatch[1];
      const timeStr = timeMatch ? timeMatch[1] : '12:00 PM';

      const dateTimeStr = `${dateStr} ${timeStr}`;
      const dateTime = new Date(dateTimeStr);

      return {
        title,
        description: emailBody.substring(0, 500),
        dateTime,
        location: locationMatch ? locationMatch[1].trim() : 'TBD',
        category: this._categorizeEvent(title),
        confidence: 0.8
      };
    }

    return null;
  }

  // Categorize event based on title
  _categorizeEvent(title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('competition') || lowerTitle.includes('contest')) {
      return 'competition';
    } else if (lowerTitle.includes('workshop')) {
      return 'workshop';
    } else if (lowerTitle.includes('webinar')) {
      return 'webinar';
    } else if (lowerTitle.includes('social') || lowerTitle.includes('club')) {
      return 'social';
    }
    return 'academic';
  }

  // Build Gmail search query
  _buildEmailQuery(filters) {
    let query = '';

    // Add sender filters
    if (filters.senders && filters.senders.length > 0) {
      const senderQuery = filters.senders.map(sender => `from:${sender}`).join(' OR ');
      query += `(${senderQuery}) `;
    }

    // Add keyword filters
    if (filters.keywords && filters.keywords.length > 0) {
      const keywordQuery = filters.keywords.join(' OR ');
      query += `(${keywordQuery}) `;
    }

    // Default keywords if none specified
    if (!query.includes('event') && !query.includes('workshop')) {
      query += '(event OR workshop OR competition OR webinar) ';
    }

    // Only recent emails
    query += 'newer_than:30d';

    return query.trim();
  }

  // Get OAuth2 client
  _getOAuth2Client() {
    const { google } = require('googleapis');
    return new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );
  }
}

module.exports = new EmailIntegrationService();
