const express = require('express');
const router = express.Router();
const reminderOptimizer = require('../services/reminderOptimizerService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Optimize reminder time for an event
router.post('/optimize/:eventId', async (req, res) => {
  try {
    const { daysBefore } = req.body;
    const Event = require('../models/Event');
    const event = await Event.findOne({
      _id: req.params.eventId,
      userId: req.user.id
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const optimalTime = await reminderOptimizer.calculateOptimalReminderTime(
      req.user.id,
      event.dateTime,
      daysBefore || 7
    );

    res.json({
      eventId: req.params.eventId,
      optimalTime: optimalTime.scheduledFor,
      confidence: optimalTime.confidence,
      reason: optimalTime.reason
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record user interaction with reminder
router.post('/interaction/:reminderId', async (req, res) => {
  try {
    const { action } = req.body; // 'opened', 'clicked', 'dismissed', 'snoozed'
    await reminderOptimizer.recordInteraction(req.params.reminderId, action);
    res.json({ message: 'Interaction recorded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run optimization for all user's upcoming reminders
router.post('/optimize-all', async (req, res) => {
  try {
    await reminderOptimizer.optimizeAllReminders();
    res.json({ message: 'Reminder optimization completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
