const express = require('express');
const router = express.Router();
const friendsService = require('../services/friendsService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Send friend request
router.post('/request/:userId', async (req, res) => {
  try {
    const result = await friendsService.sendFriendRequest(req.user.id, req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Accept friend request
router.post('/accept/:requestId', async (req, res) => {
  try {
    const result = await friendsService.acceptFriendRequest(req.user.id, req.params.requestId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Decline friend request
router.post('/decline/:requestId', async (req, res) => {
  try {
    const result = await friendsService.declineFriendRequest(req.user.id, req.params.requestId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get friends list
router.get('/', async (req, res) => {
  try {
    const friends = await friendsService.getFriends(req.user.id);
    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending requests
router.get('/requests', async (req, res) => {
  try {
    const requests = await friendsService.getPendingRequests(req.user.id);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove friend
router.delete('/:friendId', async (req, res) => {
  try {
    const result = await friendsService.removeFriend(req.user.id, req.params.friendId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get friends' events
router.get('/events', async (req, res) => {
  try {
    const events = await friendsService.getFriendsEvents(req.user.id);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
