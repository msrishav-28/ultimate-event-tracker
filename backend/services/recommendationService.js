const Event = require('../models/Event');
const User = require('../models/User');
const llmService = require('./llmService');

class RecommendationService {
  // Get personalized recommendations for a user
  async getRecommendations(userId, limit = 5) {
    try {
      const user = await User.findById(userId).populate('profile');
      if (!user) {
        return [];
      }

      // Get user's event history
      const userEvents = await Event.find({
        userId,
        status: { $in: ['completed', 'scheduled'] }
      }).sort({ createdAt: -1 });

      if (userEvents.length < 2) {
        // Cold start: recommend popular events in user's categories
        return this.getPopularEventsByCategory(user.preferences.interestedCategories, limit);
      }

      // Generate recommendations using hybrid approach
      const recommendations = await this.generateHybridRecommendations(userId, userEvents, user, limit);

      // Enhance with LLM if available
      if (llmService.shouldUseLLM('recommendations')) {
        try {
          const availableEvents = await Event.find({
            userId: { $ne: userId },
            status: 'scheduled',
            dateTime: { $gte: new Date() },
            isPublic: true
          }).limit(50);

          const llmEnhanced = await llmService.generatePersonalizedRecommendations(user, userEvents, availableEvents);
          if (llmEnhanced && llmEnhanced.length > 0) {
            // Merge LLM recommendations with algorithmic ones
            recommendations.unshift(...llmEnhanced.slice(0, 2)); // Add top 2 LLM recommendations
            recommendations.splice(limit); // Keep within limit
          }
        } catch (error) {
          console.error('LLM recommendation enhancement failed:', error);
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  // Generate hybrid recommendations (collaborative + content-based)
  async generateHybridRecommendations(userId, userEvents, user, limit) {
    const recommendations = [];

    // 1. Content-based filtering: find similar events to ones user liked
    const contentBased = await this.getContentBasedRecommendations(userEvents, user, limit * 0.6);
    recommendations.push(...contentBased);

    // 2. Collaborative filtering: find events that similar users attended
    const collaborative = await this.getCollaborativeRecommendations(userId, userEvents, user, limit * 0.4);
    recommendations.push(...collaborative);

    // 3. Category-based: events in user's preferred categories
    const categoryBased = await this.getCategoryBasedRecommendations(user, limit * 0.2);
    recommendations.push(...categoryBased);

    // Remove duplicates and rank
    const uniqueRecommendations = this.removeDuplicatesAndRank(recommendations);

    return uniqueRecommendations.slice(0, limit);
  }

  // Content-based recommendations
  async getContentBasedRecommendations(userEvents, user, limit) {
    const recommendations = [];

    // Find events user rated highly or attended
    const positiveEvents = userEvents.filter(event =>
      event.attended && (!event.rating || event.rating >= 4)
    );

    if (positiveEvents.length === 0) return recommendations;

    // Extract features from positive events
    const userPreferences = this.extractUserPreferences(positiveEvents);

    // Find events with similar features
    const similarEvents = await Event.find({
      userId: { $ne: user._id },
      status: 'scheduled',
      dateTime: { $gte: new Date() },
      $or: [
        { category: { $in: userPreferences.categories } },
        { tags: { $in: userPreferences.tags } }
      ]
    })
    .populate('userId', 'profile.name')
    .limit(limit * 3);

    // Score events based on similarity
    const scoredEvents = similarEvents.map(event => ({
      ...event.toObject(),
      score: this.calculateContentSimilarity(event, userPreferences),
      reason: 'Similar to events you enjoyed'
    }));

    recommendations.push(...scoredEvents);
    return recommendations;
  }

  // Collaborative filtering recommendations
  async getCollaborativeRecommendations(userId, userEvents, user, limit) {
    const recommendations = [];

    // Find similar users based on event attendance
    const similarUsers = await this.findSimilarUsers(userId, userEvents, Math.ceil(limit / 2));

    if (similarUsers.length === 0) return recommendations;

    // Get events that similar users attended but this user hasn't
    const similarUserIds = similarUsers.map(u => u._id);
    const attendedEventIds = userEvents.map(e => e._id);

    const collaborativeEvents = await Event.find({
      userId: { $in: similarUserIds },
      _id: { $nin: attendedEventIds },
      status: 'scheduled',
      dateTime: { $gte: new Date() },
      isPublic: true
    })
    .populate('userId', 'profile.name')
    .limit(limit * 2);

    // Score based on user similarity
    const scoredEvents = collaborativeEvents.map(event => {
      const similarUser = similarUsers.find(u => u._id.toString() === event.userId._id.toString());
      return {
        ...event.toObject(),
        score: similarUser ? similarUser.similarity * 0.8 : 0.6,
        reason: 'Popular among students with similar interests'
      };
    });

    recommendations.push(...scoredEvents);
    return recommendations;
  }

  // Category-based recommendations
  async getCategoryBasedRecommendations(user, limit) {
    const interestedCategories = user.preferences.interestedCategories || [];

    if (interestedCategories.length === 0) return [];

    const categoryEvents = await Event.find({
      category: { $in: interestedCategories },
      status: 'scheduled',
      dateTime: { $gte: new Date() },
      isPublic: true
    })
    .populate('userId', 'profile.name')
    .sort({ priority: -1, dateTime: 1 })
    .limit(limit);

    return categoryEvents.map(event => ({
      ...event.toObject(),
      score: 0.7,
      reason: `Matches your interest in ${event.category}`
    }));
  }

  // Find similar users
  async findSimilarUsers(userId, userEvents, limit) {
    const userCategories = [...new Set(userEvents.map(e => e.category))];
    const userTags = [...new Set(userEvents.flatMap(e => e.tags || []))];

    // Find users with similar event patterns
    const similarUsers = await User.find({
      _id: { $ne: userId }
    })
    .select('_id profile.name')
    .limit(50); // Get more users to filter

    // Calculate similarity scores
    const scoredUsers = [];

    for (const otherUser of similarUsers) {
      const otherUserEvents = await Event.find({
        userId: otherUser._id,
        status: { $in: ['completed', 'scheduled'] }
      }).limit(20);

      const similarity = this.calculateUserSimilarity(
        userEvents,
        otherUserEvents,
        userCategories,
        userTags
      );

      if (similarity > 0.3) { // Minimum similarity threshold
        scoredUsers.push({
          ...otherUser.toObject(),
          similarity
        });
      }
    }

    return scoredUsers
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Calculate similarity between two users
  calculateUserSimilarity(user1Events, user2Events, user1Categories, user1Tags) {
    let similarity = 0;

    // Category overlap
    const user2Categories = [...new Set(user2Events.map(e => e.category))];
    const categoryOverlap = user1Categories.filter(cat => user2Categories.includes(cat)).length;
    similarity += (categoryOverlap / Math.max(user1Categories.length, user2Categories.length)) * 0.4;

    // Tag overlap
    const user2Tags = [...new Set(user2Events.flatMap(e => e.tags || []))];
    const tagOverlap = user1Tags.filter(tag => user2Tags.includes(tag)).length;
    similarity += (tagOverlap / Math.max(user1Tags.length, user2Tags.length || 1)) * 0.3;

    // Event type preferences
    const user1CompetitionEvents = user1Events.filter(e => e.category === 'competition').length;
    const user2CompetitionEvents = user2Events.filter(e => e.category === 'competition').length;
    const competitionPreference = Math.min(user1CompetitionEvents, user2CompetitionEvents) / Math.max(user1CompetitionEvents, user2CompetitionEvents, 1);
    similarity += competitionPreference * 0.3;

    return similarity;
  }

  // Extract user preferences from their events
  extractUserPreferences(events) {
    const categories = [...new Set(events.map(e => e.category))];
    const tags = [...new Set(events.flatMap(e => e.tags || []))];

    // Count category frequency
    const categoryCount = {};
    events.forEach(event => {
      categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
    });

    const favoriteCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);

    return {
      categories: favoriteCategories,
      tags: tags.slice(0, 10), // Top 10 tags
      preferredTimes: this.extractPreferredTimes(events)
    };
  }

  // Extract preferred event times
  extractPreferredTimes(events) {
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);

    events.forEach(event => {
      const hour = event.dateTime.getHours();
      const day = event.dateTime.getDay();
      hourCounts[hour]++;
      dayCounts[day]++;
    });

    const preferredHour = hourCounts.indexOf(Math.max(...hourCounts));
    const preferredDay = dayCounts.indexOf(Math.max(...dayCounts));

    return { hour: preferredHour, day: preferredDay };
  }

  // Calculate content similarity score
  calculateContentSimilarity(event, userPreferences) {
    let score = 0.5; // Base score

    // Category match
    if (userPreferences.categories.includes(event.category)) {
      score += 0.3;
    }

    // Tag match
    const tagMatches = event.tags ? event.tags.filter(tag => userPreferences.tags.includes(tag)).length : 0;
    score += (tagMatches / Math.max(event.tags?.length || 1, 1)) * 0.2;

    return Math.min(score, 1.0);
  }

  // Get popular events by category (for cold start)
  async getPopularEventsByCategory(categories, limit) {
    const events = await Event.find({
      category: { $in: categories },
      status: 'scheduled',
      dateTime: { $gte: new Date() },
      isPublic: true
    })
    .populate('userId', 'profile.name')
    .sort({ priority: -1, dateTime: 1 })
    .limit(limit);

    return events.map(event => ({
      ...event.toObject(),
      score: 0.8,
      reason: 'Popular in your areas of interest'
    }));
  }

  // Remove duplicates and rank recommendations
  removeDuplicatesAndRank(recommendations) {
    const seen = new Set();
    const unique = [];

    for (const rec of recommendations) {
      const key = `${rec._id}-${rec.userId}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rec);
      }
    }

    // Sort by score and add diversity
    return unique.sort((a, b) => {
      // Slight randomization for diversity
      const randomFactor = (Math.random() - 0.5) * 0.1;
      return (b.score - a.score) + randomFactor;
    });
  }

  // Update user preferences based on interactions
  async updateUserPreferences(userId, eventId, interaction) {
    // This would update user preference vectors for better recommendations
    // For now, just log the interaction
    console.log(`User ${userId} ${interaction} with event ${eventId}`);
  }
}

module.exports = new RecommendationService();
