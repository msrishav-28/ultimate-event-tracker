const express = require('express');
const { authenticate } = require('../middleware/auth');
const googleCalendarService = require('../services/googleCalendarService');
const User = require('../models/User');
const Event = require('../models/Event');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Generate Google OAuth URL
router.get('/auth-url', (req, res) => {
  try {
    const authUrl = googleCalendarService.generateAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

// Handle OAuth callback
router.get('/oauth2callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange code for tokens
    const tokens = await googleCalendarService.handleCallback(code);

    // In a real implementation, you'd use the state parameter to identify the user
    // For now, we'll assume the authenticated user
    const userId = req.user._id;

    // Store tokens in user document
    await User.findByIdAndUpdate(userId, {
      'integrations.googleCalendar': {
        connected: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      }
    });

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?calendar=connected`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?calendar=error`);
  }
});

// Get user's Google Calendar connection status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const isConnected = user?.integrations?.googleCalendar?.connected || false;

    res.json({
      connected: isConnected,
      email: user?.integrations?.googleCalendar?.email || null,
      lastSync: user?.integrations?.googleCalendar?.lastSync || null
    });
  } catch (error) {
    console.error('Error getting calendar status:', error);
    res.status(500).json({ error: 'Failed to get calendar status' });
  }
});

// Get user's Google Calendars
router.get('/calendars', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user?.integrations?.googleCalendar?.connected) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    // Set user credentials
    googleCalendarService.setUserCredentials({
      access_token: user.integrations.googleCalendar.accessToken,
      refresh_token: user.integrations.googleCalendar.refreshToken,
      expiry_date: user.integrations.googleCalendar.expiryDate
    });

    const calendars = await googleCalendarService.getCalendars();

    res.json({ calendars });
  } catch (error) {
    console.error('Error getting calendars:', error);

    // Check if it's a token expiry error
    if (error.code === 401 || error.message.includes('invalid_token')) {
      // Try to refresh tokens
      try {
        const newTokens = await googleCalendarService.refreshTokens(
          user.integrations.googleCalendar.refreshToken
        );

        // Update stored tokens
        await User.findByIdAndUpdate(req.user._id, {
          'integrations.googleCalendar.accessToken': newTokens.access_token,
          'integrations.googleCalendar.expiryDate': newTokens.expiry_date
        });

        // Retry the request
        googleCalendarService.setUserCredentials(newTokens);
        const calendars = await googleCalendarService.getCalendars();
        return res.json({ calendars });
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return res.status(401).json({ error: 'Authentication expired. Please reconnect Google Calendar.' });
      }
    }

    res.status(500).json({ error: 'Failed to get calendars' });
  }
});

// Sync events with Google Calendar
router.post('/sync', async (req, res) => {
  try {
    const { calendarId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user?.integrations?.googleCalendar?.connected) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    if (!calendarId) {
      return res.status(400).json({ error: 'Calendar ID is required' });
    }

    // Set user credentials
    googleCalendarService.setUserCredentials({
      access_token: user.integrations.googleCalendar.accessToken,
      refresh_token: user.integrations.googleCalendar.refreshToken,
      expiry_date: user.integrations.googleCalendar.expiryDate
    });

    // Get user's events that should be synced
    const userEvents = await Event.find({
      userId: req.user._id,
      status: { $in: ['scheduled', 'in_progress'] }
    });

    // Perform sync
    const syncResults = await googleCalendarService.syncEvents(
      req.user._id,
      calendarId,
      userEvents
    );

    // Update last sync timestamp
    await User.findByIdAndUpdate(req.user._id, {
      'integrations.googleCalendar.lastSync': new Date()
    });

    res.json({
      success: true,
      results: syncResults,
      message: `Sync completed: ${syncResults.created.length} created, ${syncResults.updated.length} updated, ${syncResults.deleted.length} deleted`
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Export single event to Google Calendar
router.post('/export/:eventId', async (req, res) => {
  try {
    const { calendarId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user?.integrations?.googleCalendar?.connected) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    if (!calendarId) {
      return res.status(400).json({ error: 'Calendar ID is required' });
    }

    // Get the event
    const event = await Event.findOne({
      _id: req.params.eventId,
      userId: req.user._id
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Set user credentials
    googleCalendarService.setUserCredentials({
      access_token: user.integrations.googleCalendar.accessToken,
      refresh_token: user.integrations.googleCalendar.refreshToken,
      expiry_date: user.integrations.googleCalendar.expiryDate
    });

    let result;
    if (event.googleCalendarId) {
      // Update existing event
      result = await googleCalendarService.updateEvent(calendarId, event.googleCalendarId, event);
    } else {
      // Create new event
      result = await googleCalendarService.createEvent(calendarId, event);

      // Store the Google event ID
      await googleCalendarService.storeGoogleEventId(req.user._id, event._id, result.id);
    }

    res.json({
      success: true,
      googleEventId: result.id,
      message: 'Event exported to Google Calendar successfully'
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Import events from Google Calendar
router.post('/import', async (req, res) => {
  try {
    const { calendarId, since } = req.body;
    const user = await User.findById(req.user._id);

    if (!user?.integrations?.googleCalendar?.connected) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    if (!calendarId) {
      return res.status(400).json({ error: 'Calendar ID is required' });
    }

    // Set user credentials
    googleCalendarService.setUserCredentials({
      access_token: user.integrations.googleCalendar.accessToken,
      refresh_token: user.integrations.googleCalendar.refreshToken,
      expiry_date: user.integrations.googleCalendar.expiryDate
    });

    // Import events
    const importedEvents = await googleCalendarService.importEvents(
      calendarId,
      req.user._id,
      since
    );

    // Save imported events to database
    const savedEvents = [];
    for (const eventData of importedEvents) {
      try {
        const event = new Event(eventData);
        await event.save();
        savedEvents.push(event);
      } catch (error) {
        console.error('Error saving imported event:', error);
      }
    }

    res.json({
      success: true,
      imported: savedEvents.length,
      events: savedEvents.map(e => e._id),
      message: `Successfully imported ${savedEvents.length} events from Google Calendar`
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

// Disconnect Google Calendar
router.delete('/disconnect', async (req, res) => {
  try {
    // Remove Google Calendar integration from user
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { 'integrations.googleCalendar': 1 }
    });

    // Optionally remove Google Calendar IDs from events
    // await Event.updateMany(
    //   { userId: req.user._id },
    //   { $unset: { googleCalendarId: 1, googleCalendarSynced: 1 } }
    // );

    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully'
    });

  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

module.exports = router;
