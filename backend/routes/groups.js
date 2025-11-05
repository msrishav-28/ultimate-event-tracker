const express = require('express');
const router = express.Router();
const groupService = require('../services/groupService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Create group
router.post('/event/:eventId', async (req, res) => {
  try {
    const group = await groupService.createGroup(req.params.eventId, req.user.id, req.body);
    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get groups for event
router.get('/event/:eventId', async (req, res) => {
  try {
    const groups = await groupService.getEventGroups(req.params.eventId);
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join group
router.post('/:groupId/join', async (req, res) => {
  try {
    const group = await groupService.joinGroup(req.params.groupId, req.user.id);
    res.json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Leave group
router.post('/:groupId/leave', async (req, res) => {
  try {
    const group = await groupService.leaveGroup(req.params.groupId, req.user.id);
    res.json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's groups
router.get('/my', async (req, res) => {
  try {
    const groups = await groupService.getUserGroups(req.user.id);
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update group (creator only)
router.put('/:groupId', async (req, res) => {
  try {
    const group = await groupService.updateGroup(req.params.groupId, req.user.id, req.body);
    res.json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel group (creator only)
router.delete('/:groupId', async (req, res) => {
  try {
    const group = await groupService.cancelGroup(req.params.groupId, req.user.id);
    res.json({ message: 'Group cancelled' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Find study partners for event
router.get('/partners/:eventId', async (req, res) => {
  try {
    const partners = await groupService.findStudyPartners(req.params.eventId, req.user.id);
    res.json(partners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
