// Reminder Scheduler Service
const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const Event = require('../models/Event');
const User = require('../models/User');
const pushService = require('./pushNotificationService');
const emailService = require('./emailService');
const reminderOptimizer = require('./reminderOptimizerService');

class ReminderScheduler {
  constructor() {
    this.isRunning = false;
    this.job = null;
  }

  // Start the reminder scheduler
  start() {
    if (this.isRunning) {
      console.log('Reminder scheduler is already running');
      return;
    }

    console.log('Starting reminder scheduler...');

    // Check for reminders every minute
    this.job = cron.schedule('* * * * *', async () => {
      try {
        await this.checkAndSendReminders();
      } catch (error) {
        console.error('Error in reminder scheduler:', error);
      }
    });

    this.isRunning = true;
    console.log('Reminder scheduler started successfully');
  }

  // Stop the reminder scheduler
  stop() {
    if (this.job) {
      this.job.stop();
      this.isRunning = false;
      console.log('Reminder scheduler stopped');
    }
  }

  // Check for reminders that need to be sent
  async checkAndSendReminders() {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      // Find reminders that are due within the next 5 minutes
      const dueReminders = await Reminder.find({
        status: 'scheduled',
        scheduledFor: {
          $gte: now,
          $lte: fiveMinutesFromNow
        }
      }).populate('eventId').populate('userId');

      console.log(`Found ${dueReminders.length} reminders due within 5 minutes`);

      for (const reminder of dueReminders) {
        try {
          await this.sendReminder(reminder);
        } catch (error) {
          console.error(`Failed to send reminder ${reminder._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking for reminders:', error);
    }
  }

  // Send a specific reminder
  async sendReminder(reminder) {
    try {
      // Get event details
      const event = await Event.findById(reminder.eventId);
      if (!event) {
        console.log(`Event not found for reminder ${reminder._id}`);
        return;
      }

      // Get user details
      const user = await User.findById(reminder.userId);
      if (!user) {
        console.log(`User not found for reminder ${reminder._id}`);
        return;
      }

      // Prepare reminder data
      const reminderData = {
        title: reminder.message || `${event.title} Reminder`,
        message: this.generateReminderMessage(event, reminder),
        eventId: event._id,
        reminderId: reminder._id,
        eventDateTime: event.dateTime,
        location: event.location,
        priority: event.priority,
        description: event.description,
        customNote: reminder.customNote,
        preparationTasks: event.preparationTasks,
        timeUntil: this.formatTimeUntil(reminder.scheduledFor)
      };

      let notificationSent = false;

      // Try push notification first (preferred method)
      if (reminder.channel === 'browser_push' || reminder.channel === 'both') {
        const pushResult = await pushService.sendReminderNotification(user._id.toString(), reminderData);
        if (pushResult.success) {
          notificationSent = true;
          console.log(`Push notification sent for reminder ${reminder._id}`);
        } else {
          console.log(`Push notification failed for reminder ${reminder._id}: ${pushResult.error}`);
        }
      }

      // Fallback to email if push failed or email is preferred
      if (!notificationSent && (reminder.channel === 'email' || reminder.channel === 'both')) {
        const emailResult = await emailService.sendReminderEmail(user.email, reminderData);
        if (emailResult.success) {
          notificationSent = true;
          console.log(`Email notification sent for reminder ${reminder._id}`);
        } else {
          console.log(`Email notification failed for reminder ${reminder._id}: ${emailResult.error}`);
        }
      }

      // Update reminder status
      if (notificationSent) {
        reminder.status = 'sent';
        reminder.sentAt = new Date();
      } else {
        reminder.status = 'failed';
        reminder.lastError = 'Both push and email notifications failed';
        reminder.attempts += 1;
      }

      await reminder.save();

    } catch (error) {
      console.error(`Error sending reminder ${reminder._id}:`, error);

      // Update reminder with error
      reminder.status = 'failed';
      reminder.lastError = error.message;
      reminder.attempts += 1;
      await reminder.save();
    }
  }

  // Generate reminder message based on event and timing
  generateReminderMessage(event, reminder) {
    const timeUntil = this.formatTimeUntil(reminder.scheduledFor);

    let message = `${event.title} starts ${timeUntil}`;

    if (event.location) {
      message += ` at ${event.location}`;
    }

    if (reminder.customNote) {
      message += `. ${reminder.customNote}`;
    }

    return message;
  }

  // Format time until reminder
  formatTimeUntil(scheduledFor) {
    const now = new Date();
    const diffMs = scheduledFor - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'now';
    }
  }

  // Schedule reminders for a new event
  async scheduleEventReminders(event, userId) {
    try {
      const reminders = [];

      // Default reminders based on priority
      const defaultReminders = this.getDefaultReminders(event.priority);

      for (const reminderConfig of defaultReminders) {
        const scheduledFor = new Date(event.dateTime.getTime() - reminderConfig.secondsBefore * 1000);

        // Only schedule future reminders
        if (scheduledFor > new Date()) {
          const reminder = new Reminder({
            eventId: event._id,
            userId: userId,
            reminderType: 'pre_event',
            scheduledFor: scheduledFor,
            message: `${event.title} starts ${reminderConfig.label}`,
            eventDetails: {
              title: event.title,
              dateTime: event.dateTime,
              location: event.location
            },
            channel: 'browser_push', // Default to push notifications
            status: 'scheduled',
            triggeredBefore: reminderConfig.secondsBefore
          });

          reminders.push(reminder);
        }
      }

      // Save all reminders
      if (reminders.length > 0) {
        await Reminder.insertMany(reminders);
        console.log(`Scheduled ${reminders.length} reminders for event ${event._id}`);
      }

      return reminders;

    } catch (error) {
      console.error('Error scheduling reminders:', error);
      throw error;
    }
  }

  // Get default reminders based on event priority
  getDefaultReminders(priority) {
    const reminders = [];

    // All priorities get these reminders
    if (priority >= 3) { // Medium and above
      reminders.push({ secondsBefore: 86400, label: 'tomorrow' }); // 1 day
      reminders.push({ secondsBefore: 7200, label: 'in 2 hours' }); // 2 hours
    }

    if (priority >= 4) { // High and above
      reminders.push({ secondsBefore: 259200, label: 'in 3 days' }); // 3 days
    }

    if (priority >= 5) { // Critical
      reminders.push({ secondsBefore: 604800, label: 'in 1 week' }); // 1 week
    }

    return reminders;
  }

  // Cancel all reminders for an event
  async cancelEventReminders(eventId) {
    try {
      const result = await Reminder.updateMany(
        { eventId: eventId, status: 'scheduled' },
        { status: 'cancelled' }
      );

      console.log(`Cancelled ${result.modifiedCount} reminders for event ${eventId}`);
      return result;
    } catch (error) {
      console.error('Error cancelling event reminders:', error);
      throw error;
    }
  }

  // Reschedule reminders for an updated event
  async rescheduleEventReminders(eventId, newDateTime) {
    try {
      // Cancel existing reminders
      await this.cancelEventReminders(eventId);

      // Get event and user details
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Schedule new reminders with updated time
      const updatedEvent = { ...event.toObject(), dateTime: newDateTime };
      return await this.scheduleEventReminders(updatedEvent, event.userId);

    } catch (error) {
      console.error('Error rescheduling event reminders:', error);
      throw error;
    }
  }

  // Get reminder statistics
  async getReminderStats(userId = null) {
    try {
      const matchQuery = userId ? { userId } : {};

      const stats = await Reminder.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      return stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      return {};
    }
  }
}

module.exports = new ReminderScheduler();
