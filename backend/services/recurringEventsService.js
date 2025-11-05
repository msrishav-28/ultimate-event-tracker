const RecurringEventTemplate = require('../models/RecurringEventTemplate');
const Event = require('../models/Event');

class RecurringEventsService {
  // Create a recurring event template
  async createRecurringTemplate(userId, templateData) {
    const template = new RecurringEventTemplate({
      userId,
      baseEvent: templateData.baseEvent,
      recurrence: templateData.recurrence,
      autoCreateDaysBefore: templateData.autoCreateDaysBefore || 7,
      isActive: true
    });

    await template.save();
    return template;
  }

  // Process recurring events - called by background job
  async processRecurringEvents() {
    const now = new Date();
    const checkAheadDays = 14; // Check 2 weeks ahead
    const futureDate = new Date(now.getTime() + checkAheadDays * 24 * 60 * 60 * 1000);

    // Get active templates
    const templates = await RecurringEventTemplate.find({
      isActive: true,
      'recurrence.endDate': { $gt: now }
    }).populate('userId');

    for (const template of templates) {
      try {
        await this.processTemplate(template, futureDate);
      } catch (error) {
        console.error(`Error processing template ${template._id}:`, error);
      }
    }
  }

  // Process individual template
  async processTemplate(template, futureDate) {
    const instances = this.generateInstances(template, futureDate);

    for (const instance of instances) {
      // Check if instance already exists
      const existingEvent = await Event.findOne({
        userId: template.userId,
        'recurringId': template._id,
        dateTime: {
          $gte: new Date(instance.dateTime.getTime() - 1000 * 60 * 5), // 5 min window
          $lte: new Date(instance.dateTime.getTime() + 1000 * 60 * 5)
        }
      });

      if (!existingEvent) {
        // Create new event instance
        const eventData = {
          ...template.baseEvent,
          userId: template.userId,
          dateTime: instance.dateTime,
          endDateTime: instance.endDateTime,
          isRecurring: true,
          recurringId: template._id,
          sourceType: 'recurring_template'
        };

        const newEvent = new Event(eventData);
        await newEvent.save();

        // Update template with created event
        template.createdEvents.push({
          eventId: newEvent._id,
          createdDate: new Date(),
          scheduledDate: instance.dateTime
        });
      }
    }

    await template.save();
  }

  // Generate instances for a template
  generateInstances(template, futureDate) {
    const instances = [];
    const startDate = template.recurrence.startDate;
    const endDate = template.recurrence.endDate || futureDate;

    let currentDate = new Date(startDate);
    const maxInstances = 50; // Safety limit
    let count = 0;

    while (currentDate <= endDate && count < maxInstances) {
      // Skip if date is in the past or excluded
      if (currentDate >= new Date() && !this.isExcludedDate(currentDate, template.recurrence.skipDates)) {
        const instance = this.createInstance(template, currentDate);
        instances.push(instance);
      }

      // Move to next occurrence
      currentDate = this.getNextOccurrence(currentDate, template.recurrence);
      count++;
    }

    return instances;
  }

  // Check if date is excluded
  isExcludedDate(date, skipDates) {
    if (!skipDates) return false;
    return skipDates.some(skipDate =>
      skipDate.toDateString() === date.toDateString()
    );
  }

  // Get next occurrence based on pattern
  getNextOccurrence(currentDate, recurrence) {
    const next = new Date(currentDate);

    switch (recurrence.pattern) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'custom':
        next.setDate(next.getDate() + (recurrence.customInterval || 7));
        break;
      default:
        next.setDate(next.getDate() + 7); // Default to weekly
    }

    return next;
  }

  // Create event instance from template
  createInstance(template, date) {
    const instance = {
      dateTime: new Date(date),
      endDateTime: null
    };

    // Calculate end time if duration is specified
    if (template.baseEvent.duration) {
      instance.endDateTime = new Date(date.getTime() + template.baseEvent.duration * 60 * 1000);
    }

    return instance;
  }

  // Update template
  async updateTemplate(templateId, userId, updates) {
    const template = await RecurringEventTemplate.findOne({
      _id: templateId,
      userId
    });

    if (!template) {
      throw new Error('Template not found');
    }

    Object.assign(template, updates);
    await template.save();

    return template;
  }

  // Delete template and associated events
  async deleteTemplate(templateId, userId, deleteEvents = false) {
    const template = await RecurringEventTemplate.findOne({
      _id: templateId,
      userId
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (deleteEvents) {
      // Delete all created events
      await Event.deleteMany({
        userId,
        recurringId: templateId
      });
    } else {
      // Remove recurring reference from events
      await Event.updateMany(
        { userId, recurringId: templateId },
        { $unset: { isRecurring: 1, recurringId: 1 } }
      );
    }

    await RecurringEventTemplate.findByIdAndDelete(templateId);
    return { message: 'Template deleted' };
  }

  // Get user's recurring templates
  async getUserTemplates(userId) {
    return await RecurringEventTemplate.find({
      userId,
      isActive: true
    }).sort({ createdAt: -1 });
  }

  // Get events created by template
  async getTemplateEvents(templateId, userId) {
    const template = await RecurringEventTemplate.findOne({
      _id: templateId,
      userId
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return await Event.find({
      userId,
      recurringId: templateId
    }).sort({ dateTime: 1 });
  }
}

module.exports = new RecurringEventsService();
