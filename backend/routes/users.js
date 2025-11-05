const express = require('express');
const User = require('../models/User');
const Event = require('../models/Event');
const { authenticate } = require('../middleware/auth');
const pushService = require('../services/pushNotificationService');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user preferences
router.get('/preferences', async (req, res) => {
  try {
    res.json({
      preferences: req.user.preferences,
      profile: req.user.profile,
      statistics: req.user.statistics
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user preferences
router.put('/preferences', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        preferences: req.body.preferences,
        profile: req.body.profile
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences,
      profile: user.profile
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Export user data
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    // Get all user events
    const events = await Event.find({ userId: req.user._id })
      .populate('relatedEvents', 'title dateTime category')
      .populate('prepFor', 'title dateTime category')
      .sort({ dateTime: 1 });

    const userData = {
      user: {
        email: req.user.email,
        profile: req.user.profile,
        preferences: req.user.preferences,
        statistics: req.user.statistics,
        exportedAt: new Date()
      },
      events: events.map(event => ({
        ...event.toObject(),
        // Remove internal fields
        userId: undefined,
        __v: undefined
      }))
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(events);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
      res.send(csvData);
    } else if (format === 'ics') {
      // Convert to iCalendar format
      const icsData = convertToICS(events);
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename="events.ics"');
      res.send(icsData);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="user-data.json"');
      res.json(userData);
    }
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Web Push subscription management
router.post('/push-subscription', async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ error: 'Push subscription is required' });
    }

    // Add or update push subscription
    const existingIndex = req.user.pushSubscriptions.findIndex(
      sub => sub.endpoint === subscription.endpoint
    );

    if (existingIndex >= 0) {
      req.user.pushSubscriptions[existingIndex] = {
        ...subscription,
        createdAt: req.user.pushSubscriptions[existingIndex].createdAt
      };
    } else {
      req.user.pushSubscriptions.push(subscription);
    }

    await req.user.save();

    res.json({ message: 'Push subscription updated successfully' });
  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove push subscription
router.delete('/push-subscription', async (req, res) => {
  try {
    const { endpoint } = req.body;

    req.user.pushSubscriptions = req.user.pushSubscriptions.filter(
      sub => sub.endpoint !== endpoint
    );

    await req.user.save();

    res.json({ message: 'Push subscription removed successfully' });
  } catch (error) {
    console.error('Remove push subscription error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to convert events to CSV
function convertToCSV(events) {
  const headers = [
    'Title',
    'Date',
    'Time',
    'Location',
    'Category',
    'Priority',
    'Status',
    'Description',
    'Preparation Notes'
  ];

  const rows = events.map(event => [
    event.title,
    event.dateTime.toISOString().split('T')[0],
    event.dateTime.toTimeString().split(' ')[0],
    event.location,
    event.category,
    event.priority,
    event.status,
    event.description,
    event.preparationNotes
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field || ''}"`).join(','))
    .join('\n');

  return csvContent;
}

// Helper function to convert events to iCalendar format
function convertToICS(events) {
  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//College Event Tracker//EN
`;

  events.forEach(event => {
    const startTime = event.dateTime.toISOString().replace(/[-:]/g, '').split('.')[0];
    const endTime = event.endDateTime
      ? event.endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]
      : new Date(event.dateTime.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]; // Default 3 hours

    ics += `BEGIN:VEVENT
UID:${event._id}@college-events
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${event.title}
LOCATION:${event.location || ''}
DESCRIPTION:${event.description || ''}
CATEGORIES:${event.category}
PRIORITY:${6 - event.priority}  // ICS priority is inverse (1=highest, 9=lowest)
STATUS:${event.status.toUpperCase()}
END:VEVENT
`;
  });

  ics += 'END:VCALENDAR';
  return ics;
}

// Subscribe to push notifications
router.post('/push-subscription', async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    // Store subscription in push service
    pushService.storeSubscription(req.user._id.toString(), subscription);

    // Also store in user document (optional backup)
    await User.findByIdAndUpdate(req.user._id, {
      'integrations.pushSubscription': subscription
    });

    res.json({ message: 'Push subscription stored successfully' });
  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({ error: 'Failed to store push subscription' });
  }
});

// Unsubscribe from push notifications
router.delete('/push-subscription', async (req, res) => {
  try {
    // Remove subscription from push service
    pushService.removeSubscription(req.user._id.toString());

    // Also remove from user document
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { 'integrations.pushSubscription': 1 }
    });

    res.json({ message: 'Push subscription removed successfully' });
  } catch (error) {
    console.error('Push unsubscription error:', error);
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

// Test push notification
router.post('/test-push', async (req, res) => {
  try {
    const result = await pushService.sendTestNotification(req.user._id.toString());

    if (result.success) {
      res.json({ message: 'Test push notification sent successfully' });
    } else {
      res.status(500).json({
        error: 'Failed to send test push notification',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Test push notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
