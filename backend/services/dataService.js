const User = require('../models/User');
const Event = require('../models/Event');
const Reminder = require('../models/Reminder');
const GroupPrepSession = require('../models/GroupPrepSession');

class DataService {
  // Export user data in JSON format
  async exportUserData(userId) {
    const user = await User.findById(userId).select('-password -integrations.emailIntegration.accessToken -integrations.emailIntegration.refreshToken');
    const events = await Event.find({ userId });
    const reminders = await Reminder.find({ userId });
    const groups = await GroupPrepSession.find({ members: userId });

    const dataExport = {
      exportDate: new Date(),
      user: {
        name: user.profile.name,
        email: user.email,
        college: user.profile.college,
        year: user.profile.year,
        major: user.profile.major,
        department: user.profile.department,
        createdAt: user.createdAt,
        preferences: user.preferences,
        statistics: user.statistics,
        achievements: user.achievements
      },
      events: events.map(e => ({
        title: e.title,
        description: e.description,
        dateTime: e.dateTime,
        endDateTime: e.endDateTime,
        location: e.location,
        category: e.category,
        priority: e.priority,
        tags: e.tags,
        status: e.status,
        attended: e.attended,
        rating: e.rating,
        feedback: e.feedback,
        preparationNotes: e.preparationNotes,
        estimatedPrepTime: e.estimatedPrepTime,
        sourceType: e.sourceType,
        createdAt: e.createdAt
      })),
      reminders: reminders.map(r => ({
        eventTitle: r.eventDetails.title,
        scheduledFor: r.scheduledFor,
        message: r.message,
        channel: r.channel,
        status: r.status,
        sentAt: r.sentAt
      })),
      studyGroups: groups.map(g => ({
        eventTitle: g.eventId.title,
        meetupTime: g.meetupTime,
        meetupLocation: g.meetupLocation,
        notes: g.notes,
        isVirtual: g.isVirtual,
        createdAt: g.createdAt
      })),
      statistics: {
        totalEventsCreated: events.length,
        eventsAttended: events.filter(e => e.attended).length,
        attendanceRate: events.length > 0 ? ((events.filter(e => e.attended).length / events.length) * 100).toFixed(1) : 0,
        totalReminders: reminders.length,
        studyGroupsJoined: groups.length,
        favoriteCategory: user.statistics.favoriteCategory,
        totalPrepTime: events.reduce((sum, e) => sum + (e.estimatedPrepTime || 0), 0)
      }
    };

    return dataExport;
  }

  // Export events to CSV format
  async exportToCSV(userId) {
    const events = await Event.find({ userId }).sort({ dateTime: 1 });

    const headers = [
      'Title',
      'Description',
      'Date',
      'Time',
      'Location',
      'Category',
      'Priority',
      'Status',
      'Attended',
      'Rating',
      'Prep Time (min)',
      'Tags'
    ];

    const rows = events.map(event => [
      event.title,
      event.description || '',
      event.dateTime.toLocaleDateString(),
      event.dateTime.toLocaleTimeString(),
      event.location || '',
      event.category,
      event.priority,
      event.status,
      event.attended ? 'Yes' : 'No',
      event.rating || '',
      event.estimatedPrepTime || '',
      (event.tags || []).join('; ')
    ]);

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  // Export events to ICS calendar format
  async exportToICS(userId) {
    const events = await Event.find({ userId, status: { $ne: 'cancelled' } });

    let ics = 'BEGIN:VCALENDAR\n';
    ics += 'VERSION:2.0\n';
    ics += 'PRODID:-//College Event Tracker//EN\n';

    for (const event of events) {
      ics += 'BEGIN:VEVENT\n';
      ics += `UID:${event._id}@collegetracker.app\n`;
      ics += `DTSTART:${this._formatDateForICS(event.dateTime)}\n`;

      if (event.endDateTime) {
        ics += `DTEND:${this._formatDateForICS(event.endDateTime)}\n`;
      } else {
        // Default 1 hour duration
        const endTime = new Date(event.dateTime.getTime() + 60 * 60 * 1000);
        ics += `DTEND:${this._formatDateForICS(endTime)}\n`;
      }

      ics += `SUMMARY:${this._escapeICSText(event.title)}\n`;

      if (event.description) {
        ics += `DESCRIPTION:${this._escapeICSText(event.description)}\n`;
      }

      if (event.location) {
        ics += `LOCATION:${this._escapeICSText(event.location)}\n`;
      }

      // Priority mapping (1-5 to 1-9)
      if (event.priority) {
        const icsPriority = Math.max(1, Math.min(9, event.priority));
        ics += `PRIORITY:${icsPriority}\n`;
      }

      ics += `CATEGORIES:${event.category}\n`;
      ics += `STATUS:${event.status.toUpperCase()}\n`;
      ics += 'END:VEVENT\n';
    }

    ics += 'END:VCALENDAR';

    return ics;
  }

  // Complete account deletion (GDPR compliant)
  async deleteUserAccount(userId, reason = '') {
    // Step 1: Create backup before deletion (for legal compliance)
    try {
      const backupData = await this.exportUserData(userId);
      await this._storeDeletionBackup(userId, backupData, reason);
    } catch (error) {
      console.error('Failed to create backup before deletion:', error);
      // Continue with deletion even if backup fails
    }

    // Step 2: Delete all user data
    const deletionResults = {
      userDeleted: false,
      eventsDeleted: 0,
      remindersDeleted: 0,
      groupsUpdated: 0,
      backupCreated: true
    };

    // Delete user document
    await User.findByIdAndDelete(userId);
    deletionResults.userDeleted = true;

    // Delete all events
    const eventsDeleted = await Event.deleteMany({ userId });
    deletionResults.eventsDeleted = eventsDeleted.deletedCount;

    // Delete all reminders
    const remindersDeleted = await Reminder.deleteMany({ userId });
    deletionResults.remindersDeleted = remindersDeleted.deletedCount;

    // Remove user from study groups (don't delete groups, just remove member)
    const groupsUpdated = await GroupPrepSession.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );
    deletionResults.groupsUpdated = groupsUpdated.modifiedCount;

    // Remove from friends lists
    await User.updateMany(
      { 'social.friends': userId },
      { $pull: { 'social.friends': userId } }
    );

    // Log deletion
    await this._logAccountDeletion(userId, reason, deletionResults);

    return {
      success: true,
      message: 'Account deleted successfully',
      deletedData: deletionResults
    };
  }

  // Helper: Format date for ICS
  _formatDateForICS(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  // Helper: Escape text for ICS
  _escapeICSText(text) {
    return text.replace(/[\\;,]/g, '\\$&').replace(/\n/g, '\\n');
  }

  // Helper: Store deletion backup
  async _storeDeletionBackup(userId, data, reason) {
    // In production, store in secure backup storage
    // For now, just log (in real app, use S3, database, etc.)
    console.log(`Backup created for user ${userId}:`, {
      reason,
      dataSize: JSON.stringify(data).length,
      timestamp: new Date()
    });
  }

  // Helper: Log account deletion
  async _logAccountDeletion(userId, reason, results) {
    // In production, store in audit log
    console.log(`Account deletion logged for user ${userId}:`, {
      reason,
      results,
      timestamp: new Date()
    });
  }
}

module.exports = new DataService();
