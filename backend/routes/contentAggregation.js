const express = require('express');
const router = express.Router();
const contentAggregationService = require('../services/contentAggregationService');
const { authenticateToken } = require('../middleware/auth');

// Get preparation resources for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const event = await Event.findOne({
      _id: req.params.eventId,
      userId: req.user.id
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const resources = await contentAggregationService.aggregatePreparationResources(event);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search for resources by topics
router.post('/search', async (req, res) => {
  try {
    const { topics, category } = req.body;
    const mockEvent = {
      title: topics.join(' '),
      description: '',
      category: category || 'academic'
    };

    const resources = await contentAggregationService.aggregatePreparationResources(mockEvent);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get course-specific resources
router.get('/course/:courseName', async (req, res) => {
  try {
    const { courseName } = req.params;
    const { topics } = req.query;

    const topicArray = topics ? topics.split(',') : [courseName];
    const resources = await contentAggregationService.getCourseResources(courseName, topicArray);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
