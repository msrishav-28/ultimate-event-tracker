const express = require('express');
const router = express.Router();
const conflictResolver = require('../services/conflictResolverService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get current conflicts
router.get('/', async (req, res) => {
  try {
    const { timeWindow } = req.query;
    const conflicts = await conflictResolver.detectConflicts(
      req.user.id,
      parseFloat(timeWindow) || 2
    );
    res.json(conflicts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve a conflict
router.post('/resolve/:conflictId', async (req, res) => {
  try {
    const { action } = req.body;
    const result = await conflictResolver.resolveConflict(req.user.id, req.params.conflictId, action);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conflict history
router.get('/history', async (req, res) => {
  try {
    const history = await conflictResolver.getConflictHistory(req.user.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
