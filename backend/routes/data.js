const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Export user data as JSON
router.get('/export/json', async (req, res) => {
  try {
    const data = await dataService.exportUserData(req.user.id);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="my-event-data.json"');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export events as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const csvData = await dataService.exportToCSV(req.user.id);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="my-events.csv"');
    res.send(csvData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export events as ICS calendar file
router.get('/export/ics', async (req, res) => {
  try {
    const icsData = await dataService.exportToICS(req.user.id);

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="my-events.ics"');
    res.send(icsData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Permanent account deletion (GDPR)
router.post('/delete', async (req, res) => {
  try {
    const { reason, confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        error: 'Please provide correct confirmation text'
      });
    }

    const result = await dataService.deleteUserAccount(req.user.id, reason);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get data export preview (summary without full data)
router.get('/export/preview', async (req, res) => {
  try {
    const data = await dataService.exportUserData(req.user.id);

    const preview = {
      exportDate: data.exportDate,
      userInfo: {
        name: data.user.name,
        email: data.user.email,
        college: data.user.college,
        createdAt: data.user.createdAt
      },
      statistics: data.statistics,
      dataCounts: {
        events: data.events.length,
        reminders: data.reminders.length,
        studyGroups: data.studyGroups.length
      }
    };

    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
