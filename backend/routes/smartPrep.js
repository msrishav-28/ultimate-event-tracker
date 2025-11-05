const express = require('express');
const router = express.Router();
const smartPrepService = require('../services/smartPrepService');
const Event = require('../models/Event');
const { authenticateToken } = require('../middleware/auth');

// Generate prep checklist for event
router.post('/generate/:eventId', async (req, res) => {
  try {
    const checklist = await smartPrepService.generatePrepChecklist(req.params.eventId, req.user.id);
    res.json(checklist);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get checklist progress
router.get('/progress/:eventId', async (req, res) => {
  try {
    const progress = await smartPrepService.getChecklistProgress(req.params.eventId);
    res.json(progress);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Update checklist item
router.put('/progress/:eventId/:itemIndex', async (req, res) => {
  try {
    const { completed } = req.body;
    const checklist = await smartPrepService.updateChecklistProgress(
      req.params.eventId,
      parseInt(req.params.itemIndex),
      completed
    );
    res.json(checklist);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Regenerate checklist (if requirements changed)
router.post('/regenerate/:eventId', async (req, res) => {
  try {
    // Delete existing checklist
    await Event.findByIdAndUpdate(req.params.eventId, {
      $unset: { smartPrepChecklist: 1 }
    });

    // Generate new one
    const checklist = await smartPrepService.generatePrepChecklist(req.params.eventId, req.user.id);
    res.json(checklist);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
