const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication (for security)
router.use(authenticateToken);

// Test LLM completion
router.post('/complete', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    const result = await llmService.complete(prompt, options);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get LLM status and available features
router.get('/status', async (req, res) => {
  try {
    const status = {
      claudeAvailable: !!process.env.CLAUDE_API_KEY,
      deepseekAvailable: !!process.env.DEEPSEEK_API_KEY,
      features: process.env.LLM_FEATURES?.split(',') || [],
      featureStatus: {
        prep_checklist: llmService.shouldUseLLM('prep_checklist'),
        recommendations: llmService.shouldUseLLM('recommendations'),
        email_content: llmService.shouldUseLLM('email_content'),
        conflict_resolution: llmService.shouldUseLLM('conflict_resolution')
      }
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate enhanced prep checklist (with LLM)
router.post('/prep-checklist', async (req, res) => {
  try {
    const { event, user } = req.body;
    const result = await llmService.generateEnhancedChecklist(event, user, {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate personalized recommendations (with LLM)
router.post('/recommendations', async (req, res) => {
  try {
    const { user, userEvents, availableEvents } = req.body;
    const result = await llmService.generatePersonalizedRecommendations(user, userEvents, availableEvents);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate personalized email content (with LLM)
router.post('/email-content', async (req, res) => {
  try {
    const { user, events, type } = req.body;
    const result = await llmService.generatePersonalizedEmail(user, events, type);
    res.json({ content: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Extract event info from email (with LLM)
router.post('/extract-event', async (req, res) => {
  try {
    const { emailContent } = req.body;
    const result = await llmService.extractEventFromEmail(emailContent);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve scheduling conflicts (with LLM)
router.post('/resolve-conflicts', async (req, res) => {
  try {
    const { user, conflictingEvents } = req.body;
    const result = await llmService.resolveScheduleConflict(user, conflictingEvents);
    res.json({ advice: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
