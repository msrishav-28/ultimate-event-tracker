// Google Calendar Integration Service
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // Generate OAuth authorization URL
  generateAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  // Handle OAuth callback and exchange code for tokens
  async handleCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  // Set credentials for a user
  setUserCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Get user's calendars
  async getCalendars() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items;
    } catch (error) {
      console.error('Error getting calendars:', error);
      throw error;
    }
  }

  // Create event in Google Calendar
  async createEvent(calendarId, eventData) {
    try {
      const googleEvent = this.transformToGoogleEvent(eventData);

      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        resource: googleEvent
      });

      return response.data;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  // Update event in Google Calendar
  async updateEvent(calendarId, eventId, eventData) {
    try {
      const googleEvent = this.transformToGoogleEvent(eventData);

      const response = await this.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: googleEvent
      });

      return response.data;
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw error;
    }
  }

  // Delete event from Google Calendar
  async deleteEvent(calendarId, eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw error;
    }
  }

  // Get events from Google Calendar
  async getEvents(calendarId, timeMin, timeMax) {
    try {
      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        timeMax: timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ahead
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items;
    } catch (error) {
      console.error('Error getting Google Calendar events:', error);
      throw error;
    }
  }

  // Sync events between our app and Google Calendar
  async syncEvents(userId, calendarId, appEvents) {
    try {
      const syncResults = {
        created: [],
        updated: [],
        deleted: [],
        errors: []
      };

      // Get Google Calendar events
      const googleEvents = await this.getEvents(calendarId);

      // Create a map of Google events by our app's event ID (stored in description or extended properties)
      const googleEventsByAppId = new Map();
      googleEvents.forEach(googleEvent => {
        const appEventId = this.extractAppEventId(googleEvent);
        if (appEventId) {
          googleEventsByAppId.set(appEventId, googleEvent);
        }
      });

      // Sync each app event
      for (const appEvent of appEvents) {
        try {
          const googleEvent = googleEventsByAppId.get(appEvent.id);

          if (appEvent.addToCalendar) {
            if (googleEvent) {
              // Update existing event
              await this.updateEvent(calendarId, googleEvent.id, appEvent);
              syncResults.updated.push(appEvent.id);
            } else {
              // Create new event
              const createdEvent = await this.createEvent(calendarId, appEvent);
              syncResults.created.push(appEvent.id);
              // Store the Google event ID in our database
              await this.storeGoogleEventId(userId, appEvent.id, createdEvent.id);
            }
          } else if (googleEvent) {
            // Remove from Google Calendar if addToCalendar is false
            await this.deleteEvent(calendarId, googleEvent.id);
            syncResults.deleted.push(appEvent.id);
          }
        } catch (error) {
          console.error(`Error syncing event ${appEvent.id}:`, error);
          syncResults.errors.push({ eventId: appEvent.id, error: error.message });
        }
      }

      return syncResults;
    } catch (error) {
      console.error('Error syncing events:', error);
      throw error;
    }
  }

  // Transform our event format to Google Calendar format
  transformToGoogleEvent(eventData) {
    const startDateTime = new Date(`${eventData.date}T${eventData.time}:00Z`);
    const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000); // Default 3 hours

    return {
      summary: eventData.title,
      description: `${eventData.description || ''}\n\nEvent ID: ${eventData.id}`,
      location: eventData.location || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC'
      },
      reminders: {
        useDefault: false,
        overrides: this.transformReminders(eventData.reminders)
      },
      extendedProperties: {
        private: {
          appEventId: eventData.id,
          appSource: 'college-event-tracker'
        }
      }
    };
  }

  // Transform our reminder format to Google Calendar format
  transformReminders(reminders) {
    const googleReminders = [];

    if (reminders.oneWeek) {
      googleReminders.push({ method: 'popup', minutes: 7 * 24 * 60 }); // 1 week
    }
    if (reminders.threeDays) {
      googleReminders.push({ method: 'popup', minutes: 3 * 24 * 60 }); // 3 days
    }
    if (reminders.oneDay) {
      googleReminders.push({ method: 'popup', minutes: 24 * 60 }); // 1 day
    }
    if (reminders.twoHours) {
      googleReminders.push({ method: 'popup', minutes: 120 }); // 2 hours
    }

    return googleReminders;
  }

  // Extract our app's event ID from Google Calendar event
  extractAppEventId(googleEvent) {
    // Check extended properties first
    if (googleEvent.extendedProperties?.private?.appEventId) {
      return googleEvent.extendedProperties.private.appEventId;
    }

    // Fallback to description parsing
    if (googleEvent.description) {
      const match = googleEvent.description.match(/Event ID: ([^\n]+)/);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // Store Google Calendar event ID in our database
  async storeGoogleEventId(userId, appEventId, googleEventId) {
    try {
      const Event = require('../models/Event');
      await Event.findOneAndUpdate(
        { _id: appEventId, userId },
        { googleCalendarId: googleEventId, googleCalendarSynced: true }
      );
    } catch (error) {
      console.error('Error storing Google event ID:', error);
    }
  }

  // Import events from Google Calendar
  async importEvents(calendarId, userId, since = null) {
    try {
      const importedEvents = [];
      const googleEvents = await this.getEvents(calendarId, since);

      for (const googleEvent of googleEvents) {
        try {
          // Skip events that are already synced from our app
          if (this.extractAppEventId(googleEvent)) {
            continue;
          }

          // Skip all-day events or events without start time
          if (!googleEvent.start?.dateTime) {
            continue;
          }

          const appEvent = this.transformFromGoogleEvent(googleEvent, userId);
          importedEvents.push(appEvent);
        } catch (error) {
          console.error('Error importing Google event:', error);
        }
      }

      return importedEvents;
    } catch (error) {
      console.error('Error importing events:', error);
      throw error;
    }
  }

  // Transform Google Calendar event to our format
  transformFromGoogleEvent(googleEvent, userId) {
    const startDateTime = new Date(googleEvent.start.dateTime);
    const endDateTime = new Date(googleEvent.end.dateTime);

    return {
      userId,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || '',
      date: startDateTime.toISOString().split('T')[0],
      time: startDateTime.toTimeString().split(' ')[0].substring(0, 5),
      location: googleEvent.location || '',
      category: 'meeting', // Default category for imported events
      priority: 3, // Medium priority
      addToCalendar: true,
      postToFriends: false,
      googleCalendarId: googleEvent.id,
      googleCalendarSynced: true,
      sourceType: 'google_import'
    };
  }

  // Refresh OAuth tokens
  async refreshTokens(refreshToken) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      throw error;
    }
  }
}

module.exports = new GoogleCalendarService();
