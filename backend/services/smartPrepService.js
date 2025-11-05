const Event = require('../models/Event');
const User = require('../models/User');
const llmService = require('./llmService');

class SmartPrepService {
  // Generate smart prep checklist for an event
  async generatePrepChecklist(eventId, userId) {
    const event = await Event.findById(eventId);
    const user = await User.findById(userId);

    if (!event) {
      throw new Error('Event not found');
    }

    // Analyze event and user to generate checklist
    const checklistData = await this.analyzeEventAndGenerateChecklist(event, user);

    // Save checklist to event
    event.smartPrepChecklist = checklistData;
    await event.save();

    return checklistData;
  }

  // Analyze event and generate comprehensive checklist
  async analyzeEventAndGenerateChecklist(event, user) {
    const eventType = this.categorizeEventType(event);
    const userLevel = this.assessUserLevel(user, event.category);
    const timeUntilEvent = this.calculateTimeUntilEvent(event.dateTime);

    // Generate checklist items based on event type
    const checklistItems = this.generateChecklistItems(eventType, userLevel, event, timeUntilEvent);

    // Calculate total time and optimal schedule
    const totalTime = checklistItems.reduce((sum, item) => sum + item.estimatedTime, 0);
    const schedule = this.createOptimalSchedule(checklistItems, event.dateTime, totalTime);

    let finalChecklist = {
      items: checklistItems,
      totalEstimatedTime: totalTime,
      recommendedStartDate: schedule.startDate,
      generatedAt: new Date(),
      lastUpdated: new Date(),
      schedule: schedule.dailyBreakdown
    };

    // Enhance with LLM if available and enabled
    if (llmService.shouldUseLLM('prep_checklist')) {
      try {
        const enhanced = await llmService.generateEnhancedChecklist(event, user, finalChecklist);
        if (enhanced && enhanced.items) {
          finalChecklist.items = enhanced.items;
          finalChecklist.enhanced = true;
          finalChecklist.enhancementSource = 'claude';
        }
      } catch (error) {
        console.error('LLM enhancement failed, using rule-based checklist:', error);
        finalChecklist.enhanced = false;
      }
    }

    return finalChecklist;
  }

  // Categorize event type for checklist generation
  categorizeEventType(event) {
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();
    const category = event.category;

    // Competition events
    if (category === 'competition' ||
        title.includes('contest') || title.includes('competition') ||
        title.includes('hackathon') || title.includes('coding')) {
      return 'competition';
    }

    // Webinar/Seminar
    if (category === 'webinar' || title.includes('webinar') || title.includes('seminar')) {
      return 'webinar';
    }

    // Workshop
    if (category === 'workshop' || title.includes('workshop')) {
      return 'workshop';
    }

    // Academic
    if (category === 'academic' || title.includes('lecture') || title.includes('class')) {
      return 'academic';
    }

    // Social/Extracurricular
    return 'social';
  }

  // Assess user experience level
  assessUserLevel(user, eventCategory) {
    // Simple assessment based on interests and stats
    const interestAreas = user.profile.interestAreas || [];
    const eventsAttended = user.achievements?.scores?.eventsAttended || 0;

    // Check if user has relevant interests
    const hasRelevantInterest = interestAreas.some(area =>
      this.isRelevantInterest(area, eventCategory)
    );

    if (eventsAttended > 20 && hasRelevantInterest) return 'expert';
    if (eventsAttended > 10 || hasRelevantInterest) return 'intermediate';
    return 'beginner';
  }

  // Check if interest is relevant to event category
  isRelevantInterest(interest, category) {
    const mappings = {
      'competitive-programming': ['competition'],
      'machine-learning': ['webinar', 'workshop'],
      'web-dev': ['webinar', 'workshop'],
      'data-science': ['webinar', 'workshop'],
      'cybersecurity': ['competition', 'workshop']
    };

    return mappings[interest]?.includes(category) || false;
  }

  // Calculate time until event
  calculateTimeUntilEvent(eventDate) {
    const now = new Date();
    const diffMs = eventDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // At least 1 day
  }

  // Generate checklist items based on event type and user level
  generateChecklistItems(eventType, userLevel, event, daysUntil) {
    const baseItems = this.getBaseChecklistItems(eventType);
    const levelSpecificItems = this.getLevelSpecificItems(eventType, userLevel);
    const timeBasedItems = this.getTimeBasedItems(daysUntil);

    const allItems = [...baseItems, ...levelSpecificItems, ...timeBasedItems];

    // Add event-specific items
    if (event.category === 'competition') {
      allItems.push(...this.getCompetitionSpecificItems(userLevel));
    }

    // Prioritize and assign times
    return this.prioritizeAndTimeItems(allItems, userLevel, daysUntil);
  }

  // Get base checklist items for event type
  getBaseChecklistItems(eventType) {
    const baseChecklists = {
      competition: [
        { task: 'Review event rules and format', category: 'preparation' },
        { task: 'Set up development environment', category: 'technical' },
        { task: 'Practice sample problems', category: 'practice' },
        { task: 'Plan time management strategy', category: 'strategy' }
      ],
      webinar: [
        { task: 'Check technical requirements', category: 'technical' },
        { task: 'Prepare questions to ask', category: 'engagement' },
        { task: 'Set up comfortable viewing space', category: 'environment' }
      ],
      workshop: [
        { task: 'Review prerequisite knowledge', category: 'preparation' },
        { task: 'Prepare development environment', category: 'technical' },
        { task: 'Set learning goals', category: 'planning' }
      ],
      academic: [
        { task: 'Review relevant materials', category: 'preparation' },
        { task: 'Prepare questions for speaker', category: 'engagement' },
        { task: 'Note key takeaways during event', category: 'learning' }
      ],
      social: [
        { task: 'Plan networking goals', category: 'planning' },
        { task: 'Prepare introduction/elevator pitch', category: 'communication' }
      ]
    };

    return baseChecklists[eventType] || baseChecklists.social;
  }

  // Get level-specific items
  getLevelSpecificItems(eventType, userLevel) {
    const levelItems = {
      beginner: [
        { task: 'Learn basic concepts related to the topic', category: 'foundation' },
        { task: 'Find beginner-friendly resources', category: 'resources' }
      ],
      intermediate: [
        { task: 'Deepen understanding of advanced concepts', category: 'advanced' },
        { task: 'Connect with similar experience participants', category: 'networking' }
      ],
      expert: [
        { task: 'Prepare to share expertise with others', category: 'mentoring' },
        { task: 'Identify potential collaboration opportunities', category: 'networking' }
      ]
    };

    return levelItems[userLevel] || [];
  }

  // Get time-based items
  getTimeBasedItems(daysUntil) {
    const items = [];

    if (daysUntil >= 7) {
      items.push({ task: 'Schedule dedicated prep time', category: 'planning' });
    }

    if (daysUntil <= 3) {
      items.push({ task: 'Do final review of key concepts', category: 'review' });
      items.push({ task: 'Ensure all logistics are ready', category: 'logistics' });
    }

    items.push({ task: 'Get good rest before event', category: 'wellness', optional: true });

    return items;
  }

  // Get competition-specific items
  getCompetitionSpecificItems(userLevel) {
    const items = [
      { task: 'Analyze past competition problems', category: 'analysis' },
      { task: 'Practice time-constrained problem solving', category: 'practice' }
    ];

    if (userLevel === 'expert') {
      items.push({ task: 'Review edge cases and optimizations', category: 'advanced' });
    }

    return items;
  }

  // Prioritize and assign time estimates
  prioritizeAndTimeItems(items, userLevel, daysUntil) {
    const timeMultipliers = {
      beginner: 1.5,
      intermediate: 1.0,
      expert: 0.8
    };

    const multiplier = timeMultipliers[userLevel] || 1.0;

    // Base time estimates by category
    const timeEstimates = {
      preparation: 60,
      technical: 45,
      practice: 120,
      strategy: 30,
      engagement: 20,
      environment: 15,
      planning: 25,
      learning: 30,
      communication: 20,
      foundation: 90,
      resources: 30,
      advanced: 60,
      networking: 45,
      mentoring: 30,
      analysis: 60,
      review: 45,
      logistics: 15,
      wellness: 480 // 8 hours sleep
    };

    return items.map((item, index) => {
      const baseTime = timeEstimates[item.category] || 30;
      const estimatedTime = Math.round(baseTime * multiplier);

      return {
        task: item.task,
        estimatedTime,
        difficulty: this.assignDifficulty(item.category, userLevel),
        resources: this.suggestResources(item.category, item.task),
        optional: item.optional || false,
        priority: this.assignPriority(item.category, daysUntil),
        completed: false,
        completedAt: null
      };
    });
  }

  // Assign difficulty level
  assignDifficulty(category, userLevel) {
    const difficultyMap = {
      beginner: { foundation: 'easy', technical: 'easy', advanced: 'hard' },
      intermediate: { foundation: 'easy', technical: 'medium', advanced: 'medium' },
      expert: { foundation: 'easy', technical: 'easy', advanced: 'easy' }
    };

    return difficultyMap[userLevel]?.[category] || 'medium';
  }

  // Suggest resources for task
  suggestResources(category, task) {
    // This would integrate with the content aggregation service
    // For now, return mock suggestions
    const suggestions = {
      technical: [{ title: 'Setup Guide', url: '#', source: 'docs' }],
      practice: [{ title: 'Practice Problems', url: '#', source: 'platform' }],
      preparation: [{ title: 'Study Materials', url: '#', source: 'docs' }]
    };

    return suggestions[category] || [];
  }

  // Assign priority
  assignPriority(category, daysUntil) {
    const urgentCategories = ['logistics', 'technical', 'review'];
    const importantCategories = ['preparation', 'practice', 'strategy'];

    if (daysUntil <= 2 && urgentCategories.includes(category)) {
      return 1; // High priority
    }

    if (importantCategories.includes(category)) {
      return 2; // Medium priority
    }

    return 3; // Low priority
  }

  // Create optimal schedule
  createOptimalSchedule(items, eventDate, totalTime) {
    const daysUntil = Math.max(1, Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24)));
    const availableDays = Math.max(1, daysUntil - 1); // Don't schedule on event day

    const dailyTime = Math.ceil(totalTime / availableDays);
    const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Start tomorrow

    // Create daily breakdown
    const dailyBreakdown = [];
    let remainingTime = totalTime;
    let currentDate = new Date(startDate);

    for (let i = 0; i < availableDays && remainingTime > 0; i++) {
      const dayTime = Math.min(dailyTime, remainingTime);
      const dayItems = this.assignItemsToDay(items, dayTime, i + 1);

      dailyBreakdown.push({
        date: new Date(currentDate),
        estimatedTime: dayTime,
        items: dayItems
      });

      remainingTime -= dayTime;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      startDate,
      totalDays: dailyBreakdown.length,
      dailyBreakdown
    };
  }

  // Assign items to a specific day
  assignItemsToDay(allItems, dayTime, dayNumber) {
    // Sort items by priority and assign to days
    const sortedItems = allItems
      .filter(item => !item.optional)
      .sort((a, b) => a.priority - b.priority);

    let assignedTime = 0;
    const assignedItems = [];

    for (const item of sortedItems) {
      if (assignedTime + item.estimatedTime <= dayTime) {
        assignedItems.push(item.task);
        assignedTime += item.estimatedTime;
      }
    }

    return assignedItems;
  }

  // Update checklist progress
  async updateChecklistProgress(eventId, itemIndex, completed) {
    const event = await Event.findById(eventId);

    if (!event || !event.smartPrepChecklist) {
      throw new Error('Checklist not found');
    }

    if (itemIndex >= event.smartPrepChecklist.items.length) {
      throw new Error('Invalid item index');
    }

    event.smartPrepChecklist.items[itemIndex].completed = completed;
    if (completed) {
      event.smartPrepChecklist.items[itemIndex].completedAt = new Date();
    }

    event.smartPrepChecklist.lastUpdated = new Date();
    await event.save();

    return event.smartPrepChecklist;
  }

  // Get checklist progress
  async getChecklistProgress(eventId) {
    const event = await Event.findById(eventId).select('smartPrepChecklist title dateTime');

    if (!event) {
      throw new Error('Event not found');
    }

    if (!event.smartPrepChecklist) {
      return null;
    }

    const checklist = event.smartPrepChecklist;
    const completedItems = checklist.items.filter(item => item.completed).length;
    const totalItems = checklist.items.length;
    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      eventTitle: event.title,
      eventDate: event.dateTime,
      checklist,
      progress: {
        completed: completedItems,
        total: totalItems,
        percentage: progressPercentage
      }
    };
  }
}

module.exports = new SmartPrepService();
