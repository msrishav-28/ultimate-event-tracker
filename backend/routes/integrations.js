const express = require('express');
const router = express.Router();
const emailIntegrationService = require('../services/emailIntegrationService');
const slackIntegrationService = require('../services/slackIntegrationService');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

// All routes require authentication
router.use(authenticateToken);

// Gmail integration
router.post('/gmail/connect', async (req, res) => {
  try {
    const { authCode } = req.body;
    const result = await emailIntegrationService.connectGmail(req.user.id, authCode);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/gmail/scan', async (req, res) => {
  try {
    const result = await emailIntegrationService.scanEmailsForEvents(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Slack integration
router.post('/slack/connect', async (req, res) => {
  try {
    const { botToken, channels } = req.body;
    const result = await slackIntegrationService.connectSlack(req.user.id, botToken, channels);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/slack/post-event/:eventId', async (req, res) => {
  try {
    const { channels } = req.body;
    const result = await slackIntegrationService.postEventToSlack(req.user.id, req.params.eventId, channels);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update integration settings
router.put('/settings', async (req, res) => {
  try {
    const updates = req.body;
    const allowedFields = [
      'emailIntegration.autoImportEnabled',
      'emailIntegration.emailFilters',
      'slackIntegration.channels',
      'slackIntegration.isActive'
    ];

    const updateObj = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateObj[`integrations.${field}`] = updates[field];
      }
    }

    await User.findByIdAndUpdate(req.user.id, updateObj);
    res.json({ message: 'Integration settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
