const express = require('express');
const router = express.Router();
const attendanceService = require('../services/attendanceService');
const { authenticateToken } = require('../middleware/auth');

// Generate QR code for event
router.post('/qr/:eventId', async (req, res) => {
  try {
    const qrResult = await attendanceService.generateEventQR(req.params.eventId, req.user.id);
    res.json(qrResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Check-in via QR code
router.post('/checkin/:eventId', async (req, res) => {
  try {
    const { qrData } = req.body;
    const result = await attendanceService.checkInAttendee(req.params.eventId, req.user.id, qrData);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Manual check-in (organizer only)
router.post('/manual/:eventId', async (req, res) => {
  try {
    const { attendeeEmail } = req.body;
    const result = await attendanceService.manualCheckIn(req.params.eventId, req.user.id, attendeeEmail);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get event attendance stats
router.get('/event/:eventId', async (req, res) => {
  try {
    const stats = await attendanceService.getEventAttendance(req.params.eventId, req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's attendance profile
router.get('/profile', async (req, res) => {
  try {
    const profile = await attendanceService.getUserAttendanceProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Award special achievement (admin/debug)
router.post('/award/:userId', async (req, res) => {
  try {
    const { achievementName } = req.body;
    // This would be restricted to admins in production
    const Event = require('../models/Event');
    const dummyEvent = { category: 'general' };
    await attendanceService.awardAttendanceAchievements(req.params.userId, dummyEvent);
    res.json({ message: 'Achievement awarded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
