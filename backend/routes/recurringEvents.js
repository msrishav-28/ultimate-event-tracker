const express = require('express');
const router = express.Router();
const recurringEventsService = require('../services/recurringEventsService');
const RecurringEventTemplate = require('../models/RecurringEventTemplate');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Create recurring event template
router.post('/', async (req, res) => {
  try {
    const template = await recurringEventsService.createRecurringTemplate(
      req.user.id,
      req.body
    );
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's recurring templates
router.get('/', async (req, res) => {
  try {
    const templates = await recurringEventsService.getUserTemplates(req.user.id);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific template
router.get('/:templateId', async (req, res) => {
  try {
    const template = await RecurringEventTemplate.findOne({
      _id: req.params.templateId,
      userId: req.user.id
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/:templateId', async (req, res) => {
  try {
    const template = await recurringEventsService.updateTemplate(
      req.params.templateId,
      req.user.id,
      req.body
    );
    res.json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete template
router.delete('/:templateId', async (req, res) => {
  try {
    const { deleteEvents } = req.query;
    const result = await recurringEventsService.deleteTemplate(
      req.params.templateId,
      req.user.id,
      deleteEvents === 'true'
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get events created by template
router.get('/:templateId/events', async (req, res) => {
  try {
    const events = await recurringEventsService.getTemplateEvents(
      req.params.templateId,
      req.user.id
    );
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger processing (for testing)
router.post('/process', async (req, res) => {
  try {
    await recurringEventsService.processRecurringEvents();
    res.json({ message: 'Recurring events processed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
