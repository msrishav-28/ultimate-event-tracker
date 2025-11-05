const Reminder = require('../models/Reminder');

class ReminderOptimizerService {
  // Calculate optimal reminder time for a user
  async calculateOptimalReminderTime(userId, eventDateTime, daysBefore = 7) {
    try {
      // Get user's historical reminder interactions
      const interactions = await this.getUserEngagementHistory(userId);

      if (interactions.length === 0) {
        // No history, use default time (1 week before, 8 AM)
        const defaultTime = new Date(eventDateTime);
        defaultTime.setDate(defaultTime.getDate() - daysBefore);
        defaultTime.setHours(8, 0, 0, 0);
        return {
          scheduledFor: defaultTime,
          confidence: 0.5,
          reason: 'Default time - no engagement history available'
        };
      }

      // Analyze engagement patterns
      const optimalTime = this.analyzeEngagementPatterns(interactions, eventDateTime, daysBefore);

      return optimalTime;
    } catch (error) {
      console.error('Error calculating optimal reminder time:', error);
      // Fallback to default
      const defaultTime = new Date(eventDateTime);
      defaultTime.setDate(defaultTime.getDate() - daysBefore);
      defaultTime.setHours(8, 0, 0, 0);
      return {
        scheduledFor: defaultTime,
        confidence: 0.5,
        reason: 'Fallback due to calculation error'
      };
    }
  }

  // Get user's historical engagement data
  async getUserEngagementHistory(userId, limit = 100) {
    const interactions = await Reminder.find({
      userId,
      status: { $in: ['sent', 'snoozed'] },
      sentAt: { $exists: true }
    })
    .select('sentAt status snoozedUntil')
    .sort({ sentAt: -1 })
    .limit(limit);

    // Convert to engagement data
    return interactions.map(interaction => ({
      timestamp: interaction.sentAt,
      wasEngaged: interaction.status === 'snoozed' || interaction.snoozedUntil, // User interacted
      hour: interaction.sentAt.getHours(),
      dayOfWeek: interaction.sentAt.getDay(),
      wasSnoozed: !!interaction.snoozedUntil
    }));
  }

  // Analyze patterns and find optimal time
  analyzeEngagementPatterns(interactions, eventDateTime, daysBefore) {
    // Calculate engagement rates by hour and day
    const hourlyEngagement = new Array(24).fill(0);
    const hourlyTotal = new Array(24).fill(0);
    const dailyEngagement = new Array(7).fill(0);
    const dailyTotal = new Array(7).fill(0);

    interactions.forEach(interaction => {
      const hour = interaction.hour;
      const day = interaction.dayOfWeek;

      hourlyTotal[hour]++;
      dailyTotal[day]++;

      if (interaction.wasEngaged) {
        hourlyEngagement[hour]++;
        dailyEngagement[day]++;
      }
    });

    // Calculate engagement rates
    const hourlyRates = hourlyEngagement.map((engaged, hour) =>
      hourlyTotal[hour] > 0 ? engaged / hourlyTotal[hour] : 0
    );

    const dailyRates = dailyEngagement.map((engaged, day) =>
      dailyTotal[day] > 0 ? engaged / dailyTotal[day] : 0
    );

    // Find best hour and day combination
    let bestHour = 8; // Default 8 AM
    let bestDayOffset = daysBefore; // Default days before
    let maxScore = 0;
    let bestConfidence = 0.5;

    // Try different combinations
    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) { // 1-14 days before
      for (let hour = 6; hour <= 22; hour++) { // 6 AM to 10 PM
        const eventTime = new Date(eventDateTime);
        eventTime.setDate(eventTime.getDate() - dayOffset);
        eventTime.setHours(hour, 0, 0, 0);

        // Skip if in the past
        if (eventTime < new Date()) continue;

        const dayOfWeek = eventTime.getDay();
        const hourRate = hourlyRates[hour] || 0;
        const dayRate = dailyRates[dayOfWeek] || 0;

        // Combined score (weighted average)
        const score = (hourRate * 0.7) + (dayRate * 0.3);
        const confidence = Math.min(hourlyTotal[hour] + dailyTotal[dayOfWeek], 50) / 50; // Max confidence at 50 samples

        if (score > maxScore && confidence > 0.3) {
          maxScore = score;
          bestHour = hour;
          bestDayOffset = dayOffset;
          bestConfidence = confidence;
        }
      }
    }

    // Calculate final scheduled time
    const scheduledFor = new Date(eventDateTime);
    scheduledFor.setDate(scheduledFor.getDate() - bestDayOffset);
    scheduledFor.setHours(bestHour, 0, 0, 0);

    // Ensure it's not in the past
    if (scheduledFor < new Date()) {
      scheduledFor.setDate(scheduledFor.getDate() + 1);
    }

    return {
      scheduledFor,
      confidence: Math.round(bestConfidence * 100) / 100,
      reason: `Based on your ${Math.round(bestConfidence * 100)}% engagement history - you respond best around ${bestHour}:00 on ${this.getDayName(scheduledFor.getDay())}`
    };
  }

  // Helper to get day name
  getDayName(dayIndex) {
    const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
    return days[dayIndex];
  }

  // Record user interaction for learning
  async recordInteraction(reminderId, action, timestamp = new Date()) {
    // This would update the reminder with interaction data
    // For now, just mark as interacted
    await Reminder.findByIdAndUpdate(reminderId, {
      [`interactions.${action}`]: timestamp
    });
  }

  // Batch optimize reminders for all users (background job)
  async optimizeAllReminders() {
    const upcomingReminders = await Reminder.find({
      status: 'scheduled',
      scheduledFor: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      }
    }).populate('userId', 'preferences');

    for (const reminder of upcomingReminders) {
      try {
        // Find the associated event
        const Event = require('../models/Event');
        const event = await Event.findOne({
          userId: reminder.userId,
          'reminders.triggeredBefore': reminder.triggeredBefore
        });

        if (event) {
          const optimalTime = await this.calculateOptimalReminderTime(
            reminder.userId._id,
            event.dateTime,
            Math.ceil(reminder.triggeredBefore / (24 * 60 * 60)) // Convert seconds to days
          );

          // Update reminder if significantly different
          const timeDiff = Math.abs(optimalTime.scheduledFor - reminder.scheduledFor) / (1000 * 60 * 60); // Hours diff

          if (timeDiff > 1 && optimalTime.confidence > 0.6) {
            await Reminder.findByIdAndUpdate(reminder._id, {
              scheduledFor: optimalTime.scheduledFor,
              optimizationReason: optimalTime.reason,
              optimizationConfidence: optimalTime.confidence
            });
          }
        }
      } catch (error) {
        console.error('Error optimizing reminder:', reminder._id, error);
      }
    }
  }
}

module.exports = new ReminderOptimizerService();
