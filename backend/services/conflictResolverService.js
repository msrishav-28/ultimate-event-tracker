const Event = require('../models/Event');

class ConflictResolverService {
  // Detect conflicts for a user
  async detectConflicts(userId, timeWindowHours = 2) {
    const now = new Date();
    const futureWindow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Get all scheduled events in the next 30 days
    const events = await Event.find({
      userId,
      status: 'scheduled',
      dateTime: {
        $gte: now,
        $lte: futureWindow
      }
    }).sort({ dateTime: 1 });

    const conflicts = [];

    // Check each pair of events for overlap
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const conflict = this.checkEventOverlap(events[i], events[j], timeWindowHours);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  // Check if two events overlap
  checkEventOverlap(event1, event2, timeWindowHours) {
    const time1 = event1.dateTime;
    const time2 = event2.dateTime;

    // Calculate time difference in hours
    const timeDiff = Math.abs(time1 - time2) / (1000 * 60 * 60);

    if (timeDiff <= timeWindowHours) {
      return {
        event1: {
          id: event1._id,
          title: event1.title,
          dateTime: event1.dateTime,
          priority: event1.priority,
          category: event1.category,
          estimatedPrepTime: event1.estimatedPrepTime || 0
        },
        event2: {
          id: event2._id,
          title: event2.title,
          dateTime: event2.dateTime,
          priority: event2.priority,
          category: event2.category,
          estimatedPrepTime: event2.estimatedPrepTime || 0
        },
        overlapMinutes: Math.round((timeWindowHours - timeDiff) * 60),
        recommendation: this.recommendEventToAttend(event1, event2)
      };
    }

    return null;
  }

  // Recommend which event to prioritize
  recommendEventToAttend(event1, event2) {
    // Scoring algorithm
    const score1 = this.calculateEventScore(event1);
    const score2 = this.calculateEventScore(event2);

    if (score1 > score2) {
      return {
        recommendedEvent: event1._id,
        recommendedTitle: event1.title,
        reason: this.getRecommendationReason(event1, event2),
        alternativeAction: this.suggestAlternativeAction(event2)
      };
    } else {
      return {
        recommendedEvent: event2._id,
        recommendedTitle: event2.title,
        reason: this.getRecommendationReason(event2, event1),
        alternativeAction: this.suggestAlternativeAction(event1)
      };
    }
  }

  // Calculate event priority score
  calculateEventScore(event) {
    let score = 0;

    // Priority weight (40%)
    score += (event.priority / 5) * 0.4;

    // Prep time ROI - less prep time is better (35%)
    const prepHours = (event.estimatedPrepTime || 0) / 60;
    score += (1 - Math.min(prepHours / 10, 1)) * 0.35; // Max 10 hours prep

    // Category preference (25%) - based on user history
    // For now, use simple category weights
    const categoryWeights = {
      'competition': 0.9,
      'workshop': 0.8,
      'webinar': 0.7,
      'academic': 0.6,
      'social': 0.4,
      'meeting': 0.3,
      'extracurricular': 0.5
    };
    score += (categoryWeights[event.category] || 0.5) * 0.25;

    return score;
  }

  // Get recommendation reason
  getRecommendationReason(recommended, other) {
    const reasons = [];

    if (recommended.priority > other.priority) {
      reasons.push(`Higher priority (${recommended.priority} vs ${other.priority})`);
    }

    const prepDiff = (other.estimatedPrepTime || 0) - (recommended.estimatedPrepTime || 0);
    if (prepDiff > 30) { // More than 30 min difference
      reasons.push(`Requires less preparation (${Math.round(prepDiff/60 * 10)/10} hours less)`);
    }

    if (recommended.category === 'competition' && other.category !== 'competition') {
      reasons.push('Competition events take precedence');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Better overall fit for your schedule';
  }

  // Suggest alternative action for non-recommended event
  suggestAlternativeAction(event) {
    const suggestions = [];

    // Suggest rescheduling
    suggestions.push({
      type: 'reschedule',
      description: `Reschedule to ${this.getNextAvailableSlot(event.dateTime)}`,
      impact: 'Avoids conflict completely'
    });

    // Suggest attending virtually if applicable
    if (event.location && !event.location.includes('Campus')) {
      suggestions.push({
        type: 'virtual',
        description: 'Check if virtual attendance is available',
        impact: 'Can attend both events'
      });
    }

    // Suggest shorter preparation
    if (event.estimatedPrepTime > 120) { // More than 2 hours
      suggestions.push({
        type: 'reduce_prep',
        description: 'Focus on key preparation points only',
        impact: 'Reduces time commitment'
      });
    }

    return suggestions;
  }

  // Get next available slot (simplified)
  getNextAvailableSlot(dateTime) {
    const nextSlot = new Date(dateTime);
    nextSlot.setDate(nextSlot.getDate() + 1); // Next day same time
    return nextSlot.toLocaleDateString() + ' ' + nextSlot.toLocaleTimeString();
  }

  // Resolve conflict by updating event
  async resolveConflict(userId, conflictId, action) {
    // This would implement the resolution actions
    // For now, just log the resolution
    console.log(`Resolving conflict ${conflictId} with action:`, action);

    // In a full implementation, this would:
    // - Reschedule events
    // - Update priorities
    // - Send notifications
    // - Update user preferences

    return { message: 'Conflict resolution recorded' };
  }

  // Get user's conflict history
  async getConflictHistory(userId, limit = 10) {
    // In a real implementation, store resolved conflicts
    // For now, return empty array
    return [];
  }
}

module.exports = new ConflictResolverService();
