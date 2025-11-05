const express = require('express');
const router = express.Router();
const organizerService = require('../services/organizerService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Convert event to organizer-managed
router.post('/event/:eventId/activate', async (req, res) => {
  try {
    const event = await organizerService.makeEventOrganizerManaged(req.params.eventId, req.user.id);
    res.json({ message: 'Event activated for organizer management', event });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get organizer's events
router.get('/events', async (req, res) => {
  try {
    const events = await organizerService.getOrganizerEvents(req.user.id);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle RSVP
router.post('/event/:eventId/rsvp', async (req, res) => {
  try {
    const { status, guestCount } = req.body;
    const result = await organizerService.handleRSVP(
      req.params.eventId,
      req.user.id,
      status,
      guestCount
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Send announcement
router.post('/event/:eventId/announce', async (req, res) => {
  try {
    const result = await organizerService.sendAnnouncement(
      req.params.eventId,
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get event analytics
router.get('/event/:eventId/analytics', async (req, res) => {
  try {
    const analytics = await organizerService.getEventAnalytics(req.params.eventId, req.user.id);
    res.json(analytics);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Generate certificates
router.post('/event/:eventId/certificates', async (req, res) => {
  try {
    const certificates = await organizerService.generateCertificates(req.params.eventId, req.user.id);
    res.json(certificates);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Track event view (called when user views event)
router.post('/event/:eventId/view', async (req, res) => {
  try {
    await organizerService.trackEventView(req.params.eventId, req.user.id);
    res.json({ message: 'View tracked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
