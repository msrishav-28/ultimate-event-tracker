const express = require('express');
const router = express.Router();
const emailDigestService = require('../services/emailDigestService');
const { authenticateToken } = require('../middleware/auth');

// Send digest to current user (for testing)
router.post('/send', async (req, res) => {
  try {
    await emailDigestService.sendWeeklyDigest(req.user.id);
    res.json({ message: 'Digest sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Preview digest content
router.get('/preview', async (req, res) => {
  try {
    const digestData = await emailDigestService.generateDigestContent(req.user.id);
    res.json(digestData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send batch digest (admin only - in production, restrict this)
router.post('/batch', async (req, res) => {
  try {
    // In production, add admin authentication check
    await emailDigestService.sendBatchDigest();
    res.json({ message: 'Batch digest sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
