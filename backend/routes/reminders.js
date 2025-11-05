const express = require('express');
const Reminder = require('../models/Reminder');
const { authenticate } = require('../middleware/auth');
const pushService = require('../services/pushNotificationService');
const emailService = require('../services/emailService');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get reminders for user
router.get('/', async (req, res) => {
  try {
    const reminders = await Reminder.find({
      userId: req.user._id,
      status: { $in: ['scheduled', 'sent'] }
    })
    .populate('eventId', 'title dateTime location')
    .sort({ scheduledFor: 1 });

    res.json({ reminders });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Snooze reminder
router.patch('/:id/snooze', async (req, res) => {
  try {
    const { minutes = 30 } = req.body;

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        status: 'snoozed',
        snoozedUntil: new Date(Date.now() + minutes * 60 * 1000)
      },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({
      message: 'Reminder snoozed successfully',
      reminder
    });
  } catch (error) {
    console.error('Snooze reminder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dismiss reminder
router.patch('/:id/dismiss', async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'sent' },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({
      message: 'Reminder dismissed successfully',
      reminder
    });
  } catch (error) {
    console.error('Dismiss reminder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test reminder notification (for development)
router.post('/test', async (req, res) => {
  try {
    const { channel = 'browser_push' } = req.body; // browser_push or email

    if (channel === 'browser_push') {
      const result = await pushService.sendTestNotification(req.user._id.toString());
      if (result.success) {
        res.json({ message: 'Test push notification sent successfully' });
      } else {
        res.status(500).json({ error: 'Failed to send push notification', details: result.error });
      }
    } else if (channel === 'email') {
      // Get user email from database
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      if (!user || !user.email) {
        return res.status(400).json({ error: 'User email not found' });
      }

      const result = await emailService.sendTestEmail(user.email);
      if (result.success) {
        res.json({ message: 'Test email sent successfully', messageId: result.messageId });
      } else {
        res.status(500).json({ error: 'Failed to send test email', details: result.error });
      }
    } else {
      res.status(400).json({ error: 'Invalid channel. Use "browser_push" or "email"' });
    }
  } catch (error) {
    console.error('Test reminder error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
