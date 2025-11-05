const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Reminder = require('../models/Reminder');
const { authenticate } = require('../middleware/auth');
const reminderScheduler = require('../services/reminderScheduler');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all events for user with advanced filtering and search
router.get('/', async (req, res) => {
  try {
    const {
      // Basic filters
      category,
      priority,
      status = 'scheduled',
      sort = 'by_relevance',
      limit = 50,
      offset = 0,

      // Advanced search parameters
      search,           // Full-text search query
      dateFrom,         // Start date filter (YYYY-MM-DD)
      dateTo,          // End date filter (YYYY-MM-DD)
      location,        // Location filter (partial match)
      organizer,       // Organizer filter (partial match)
      tags,            // Tags filter (comma-separated)
      minPriority,     // Minimum priority level (1-5)
      maxPriority,     // Maximum priority level (1-5)
      hasPrepTasks,    // Filter events with preparation tasks
      isPrepEvent,     // Filter preparation events only
      relatedTo,       // Filter events related to specific event ID
    } = req.query;

    // Build base query
    let query: any = { userId: req.user._id };

    // Apply status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Category filter
    if (category && category !== 'all') {
      if (Array.isArray(category)) {
        query.category = { $in: category };
      } else {
        query.category = category;
      }
    }

    // Priority range filter
    if (minPriority || maxPriority) {
      query.priority = {};
      if (minPriority) query.priority.$gte = parseInt(minPriority);
      if (maxPriority) query.priority.$lte = parseInt(maxPriority);
    } else if (priority) {
      query.priority = parseInt(priority);
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.dateTime = {};
      if (dateFrom) {
        query.dateTime.$gte = new Date(`${dateFrom}T00:00:00Z`);
      }
      if (dateTo) {
        query.dateTime.$lte = new Date(`${dateTo}T23:59:59Z`);
      }
    }

    // Location filter (case-insensitive partial match)
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Organizer filter
    if (organizer) {
      query.organizerName = { $regex: organizer, $options: 'i' };
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map((tag: string) => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Preparation tasks filter
    if (hasPrepTasks === 'true') {
      query.preparationTasks = { $exists: true, $ne: [] };
    }

    // Preparation event filter
    if (isPrepEvent === 'true') {
      query.isPrep = true;
    } else if (isPrepEvent === 'false') {
      query.isPrep = { $ne: true };
    }

    // Related events filter
    if (relatedTo) {
      query.relatedEvents = relatedTo;
    }

    // Full-text search with fuzzy matching
    let searchScore = {};
    if (search && search.trim()) {
      const searchTerm = search.trim();

      // Use MongoDB text search for indexed fields
      query.$text = { $search: searchTerm };

      // Also add regex search for non-indexed fields with fuzzy matching
      const fuzzyRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { title: fuzzyRegex },
        { description: fuzzyRegex },
        { location: fuzzyRegex },
        { organizerName: fuzzyRegex },
        { tags: { $in: [fuzzyRegex] } }
      ];

      // Add text score for relevance
      searchScore = { score: { $meta: 'textScore' } };
    }

    // Sorting with relevance scoring
    let sortOption: any = {};
    switch (sort) {
      case 'by_date':
        sortOption = { dateTime: 1 };
        break;
      case 'by_priority':
        sortOption = { priority: -1, dateTime: 1 };
        break;
      case 'by_relevance':
      default:
        if (search) {
          // Sort by text score, then by priority and date
          sortOption = { score: { $meta: 'textScore' }, priority: -1, dateTime: 1 };
        } else {
          // Default relevance: priority, proximity to current date, then date
          const now = new Date();
          const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

          sortOption = {
            priority: -1,
            // Boost events in next 2 weeks
            dateTime: {
              $cond: {
                if: { $and: [{ $gte: ['$dateTime', now] }, { $lte: ['$dateTime', twoWeeksFromNow] }] },
                then: 0, // Highest priority for upcoming events
                else: 1  // Lower priority for far future/past events
              }
            },
            dateTime: 1 // Then sort by actual date
          };
        }
        break;
    }

    // Execute query with pagination
    const events = await Event.find(query, searchScore)
      .sort(sortOption)
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string))
      .populate('relatedEvents', 'title dateTime category')
      .populate('prepFor', 'title dateTime category');

    // Get total count for pagination
    const total = await Event.countDocuments(query);

    // Add relevance scores for search results
    const eventsWithScores = events.map(event => {
      const eventObj = event.toObject();

      if (search) {
        // Calculate custom relevance score
        let relevanceScore = 0;

        const searchLower = search.toLowerCase();
        const titleLower = event.title.toLowerCase();
        const descLower = (event.description || '').toLowerCase();
        const locationLower = (event.location || '').toLowerCase();

        // Exact title match gets highest score
        if (titleLower.includes(searchLower)) {
          relevanceScore += 100;
          if (titleLower.startsWith(searchLower)) relevanceScore += 50; // Starts with bonus
        }

        // Description match
        if (descLower.includes(searchLower)) {
          relevanceScore += 50;
        }

        // Location match
        if (locationLower.includes(searchLower)) {
          relevanceScore += 30;
        }

        // Tag matches
        if (event.tags && event.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))) {
          relevanceScore += 40;
        }

        // Priority boost
        relevanceScore += event.priority * 10;

        // Recency boost for upcoming events
        const daysUntil = Math.ceil((new Date(event.dateTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 14) {
          relevanceScore += (14 - daysUntil) * 5; // Closer events get higher scores
        }

        eventObj.relevanceScore = relevanceScore;
      }

      return eventObj;
    });

    // Sort by relevance score if searching
    if (search) {
      eventsWithScores.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }

    res.json({
      events: eventsWithScores,
      total,
      hasMore: parseInt(offset as string) + events.length < total,
      searchQuery: search || null,
      filtersApplied: {
        category,
        priority,
        status,
        dateFrom,
        dateTo,
        location,
        organizer,
        tags,
        hasPrepTasks,
        isPrepEvent
      }
  }
});

// Dedicated search endpoint with suggestions and autocomplete
router.get('/search', async (req, res) => {
  try {
    const {
      q: query,          // Search query
      limit = 20,        // Result limit
      suggest = false,   // Return suggestions only
      category,          // Category filter
      dateFrom,          // Date from filter
      dateTo             // Date to filter
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        results: [],
        suggestions: [],
        total: 0
      });
    }

    // Build search query
    let searchQuery: any = { userId: req.user._id };

    // Apply filters
    if (category && category !== 'all') {
      searchQuery.category = category;
    }

    if (dateFrom || dateTo) {
      searchQuery.dateTime = {};
      if (dateFrom) searchQuery.dateTime.$gte = new Date(`${dateFrom}T00:00:00Z`);
      if (dateTo) searchQuery.dateTime.$lte = new Date(`${dateTo}T23:59:59Z`);
    }

    // Fuzzy search regex
    const searchRegex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Search across multiple fields
    searchQuery.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { location: searchRegex },
      { organizerName: searchRegex },
      { tags: { $in: [searchRegex] } }
    ];

    if (suggest === 'true') {
      // Return suggestions for autocomplete
      const suggestions = await Event.distinct('title', {
        userId: req.user._id,
        title: searchRegex
      }).limit(10);

      const locationSuggestions = await Event.distinct('location', {
        userId: req.user._id,
        location: searchRegex
      }).limit(5);

      const organizerSuggestions = await Event.distinct('organizerName', {
        userId: req.user._id,
        organizerName: searchRegex
      }).limit(5);

      return res.json({
        suggestions: {
          titles: suggestions,
          locations: locationSuggestions.filter(l => l),
          organizers: organizerSuggestions.filter(o => o)
        }
      });
    }

    // Execute search
    const events = await Event.find(searchQuery)
      .sort({ priority: -1, dateTime: 1 })
      .limit(parseInt(limit as string))
      .select('title description location dateTime priority category organizerName tags');

    // Calculate relevance and add highlights
    const results = events.map(event => {
      const eventObj = event.toObject();
      let relevanceScore = 0;
      const highlights: string[] = [];

      const queryLower = query.toLowerCase();

      // Title matches (highest weight)
      if (event.title.toLowerCase().includes(queryLower)) {
        relevanceScore += 100;
        highlights.push(`Title: ${event.title}`);
      }

      // Description matches
      if (event.description && event.description.toLowerCase().includes(queryLower)) {
        relevanceScore += 50;
        const descMatch = event.description.substring(
          Math.max(0, event.description.toLowerCase().indexOf(queryLower) - 20),
          event.description.toLowerCase().indexOf(queryLower) + query.length + 20
        );
        highlights.push(`Description: ...${descMatch}...`);
      }

      // Location matches
      if (event.location && event.location.toLowerCase().includes(queryLower)) {
        relevanceScore += 30;
        highlights.push(`Location: ${event.location}`);
      }

      // Organizer matches
      if (event.organizerName && event.organizerName.toLowerCase().includes(queryLower)) {
        relevanceScore += 20;
        highlights.push(`Organizer: ${event.organizerName}`);
      }

      // Tag matches
      if (event.tags && event.tags.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
        relevanceScore += 40;
        const matchingTags = event.tags.filter((tag: string) => tag.toLowerCase().includes(queryLower));
        highlights.push(`Tags: ${matchingTags.join(', ')}`);
      }

      return {
        ...eventObj,
        relevanceScore,
        highlights,
        matchType: relevanceScore >= 100 ? 'exact' : relevanceScore >= 50 ? 'good' : 'partial'
      };
    });

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json({
      results,
      total: results.length,
      query: query.trim(),
      filters: { category, dateFrom, dateTo }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
    .populate('relatedEvents', 'title dateTime category location')
    .populate('prepFor', 'title dateTime category location');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new event
router.post('/', async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      userId: req.user._id
    };

    const event = new Event(eventData);
    await event.save();

    // Schedule reminders using the reminder scheduler service
    try {
      await reminderScheduler.scheduleEventReminders(event, req.user._id);
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      // Don't fail the event creation if reminder scheduling fails
    }

    // Update user statistics
    await updateUserStatistics(req.user._id);

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Reschedule reminders if date/time changed
    if (req.body.dateTime) {
      try {
        await reminderScheduler.rescheduleEventReminders(event._id, event.dateTime);
      } catch (error) {
        console.error('Error rescheduling reminders:', error);
        // Don't fail the update if reminder rescheduling fails
      }
    }

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update event status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update user statistics
    await updateUserStatistics(req.user._id);

    res.json({
      message: 'Event status updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Cancel associated reminders
    try {
      await reminderScheduler.cancelEventReminders(event._id);
    } catch (error) {
      console.error('Error cancelling reminders:', error);
      // Don't fail the deletion if reminder cancellation fails
    }

    // Update user statistics
    await updateUserStatistics(req.user._id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to schedule reminders
async function scheduleReminders(event) {
  const reminders = event.reminders || [];

  for (const reminder of reminders) {
    if (!reminder.isActive) continue;

    const scheduledFor = new Date(event.dateTime.getTime() - (reminder.triggeredBefore * 1000));

    // Only schedule future reminders
    if (scheduledFor > new Date()) {
      const reminderDoc = new Reminder({
        eventId: event._id,
        userId: event.userId,
        scheduledFor,
        message: generateReminderMessage(event, reminder.triggeredBefore),
        eventDetails: {
          title: event.title,
          dateTime: event.dateTime,
          location: event.location,
          customNote: event.preparationNotes
        },
        channel: reminder.channel
      });

      await reminderDoc.save();
    }
  }
}

// Helper function to generate reminder message
function generateReminderMessage(event, secondsBefore) {
  const timeUntil = Math.round(secondsBefore / 3600); // hours

  if (timeUntil >= 24) {
    const days = Math.round(timeUntil / 24);
    return `⏰ ${event.title} in ${days} day${days > 1 ? 's' : ''}`;
  } else if (timeUntil > 0) {
    return `⏰ ${event.title} in ${timeUntil} hour${timeUntil > 1 ? 's' : ''}`;
  } else {
    const minutes = Math.round(secondsBefore / 60);
    return `⏰ ${event.title} in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

// Helper function to update user statistics
async function updateUserStatistics(userId) {
  try {
    const User = require('../models/User');

    const stats = await Event.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          eventsAttended: {
            $sum: { $cond: [{ $eq: ['$attended', true] }, 1, 0] }
          },
          avgPrep: { $avg: '$estimatedPrepTime' },
          categories: { $push: '$category' }
        }
      }
    ]);

    if (stats.length > 0) {
      const stat = stats[0];
      const favoriteCategory = stat.categories.reduce((a, b, i, arr) =>
        arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
      );

      await User.findByIdAndUpdate(userId, {
        'statistics.totalEventsCreated': stat.totalEvents,
        'statistics.eventsAttended': stat.eventsAttended,
        'statistics.averagePrep': Math.round(stat.avgPrep || 0),
        'statistics.favoriteCategory': favoriteCategory
      });
    }
  } catch (error) {
    console.error('Update user statistics error:', error);
  }
}

module.exports = router;
