const express = require('express');
const router = express.Router();
const leaderboardService = require('../services/leaderboardService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get leaderboard
router.get('/:category/:college', async (req, res) => {
  try {
    const { category, college } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const leaderboard = await leaderboardService.getLeaderboard(category, college, limit);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's rank
router.get('/rank/:category/:college', async (req, res) => {
  try {
    const { category, college } = req.params;
    const rank = await leaderboardService.getUserRank(req.user.id, category, college);
    res.json(rank);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top performers
router.get('/top/:college', async (req, res) => {
  try {
    const { college } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const topPerformers = await leaderboardService.getTopPerformers(college, limit);
    res.json(topPerformers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update leaderboard (admin/internal use)
router.post('/update/:category/:college', async (req, res) => {
  try {
    const { category, college } = req.params;
    const leaderboard = await leaderboardService.updateLeaderboard(category, college);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
