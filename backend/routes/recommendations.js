const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendationService');
const { authenticateToken } = require('../middleware/auth');

// Get personalized recommendations
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const recommendations = await recommendationService.getRecommendations(req.user.id, limit);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recommendations by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    // Get user preferences
    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    const recommendations = await recommendationService.getCategoryBasedRecommendations(user, limit);
    const filtered = recommendations.filter(rec => rec.category === category);

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record user interaction with recommendation
router.post('/interact/:eventId', async (req, res) => {
  try {
    const { interaction } = req.body; // 'viewed', 'interested', 'dismissed'
    await recommendationService.updateUserPreferences(req.user.id, req.params.eventId, interaction);
    res.json({ message: 'Interaction recorded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get similar events to a given event
router.get('/similar/:eventId', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get user's events for context
    const userEvents = await Event.find({
      userId: req.user.id,
      status: { $in: ['completed', 'scheduled'] }
    });

    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    // Get content-based recommendations starting from this event
    const recommendations = await recommendationService.getContentBasedRecommendations([event], user, 5);

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
