const Event = require('../models/Event');
const User = require('../models/User');
const emailService = require('./emailService');
const pushService = require('./pushNotificationService');

class OrganizerService {
  // Convert event to organizer event
  async makeEventOrganizerManaged(eventId, organizerId) {
    const event = await Event.findOne({
      _id: eventId,
      userId: organizerId
    });

    if (!event) {
      throw new Error('Event not found or access denied');
    }

    event.organizerTools.isOrganizerEvent = true;
    await event.save();

    return event;
  }

  // Get organizer's events
  async getOrganizerEvents(organizerId) {
    return await Event.find({
      userId: organizerId,
      'organizerTools.isOrganizerEvent': true
    })
    .sort({ dateTime: -1 })
    .select('title dateTime location category organizerTools');
  }

  // Manage RSVPs
  async handleRSVP(eventId, userId, status, guestCount = 1) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Remove existing RSVP
    event.organizerTools.rsvps = event.organizerTools.rsvps.filter(
      rsvp => rsvp.userId.toString() !== userId
    );

    // Add new RSVP
    event.organizerTools.rsvps.push({
      userId,
      status,
      respondedAt: new Date(),
      guestCount
    });

    await event.save();

    // Update analytics
    await this.updateEventAnalytics(eventId);

    return { message: 'RSVP updated successfully' };
  }

  // Send announcement to RSVPed attendees
  async sendAnnouncement(eventId, organizerId, announcementData) {
    const event = await Event.findOne({
      _id: eventId,
      userId: organizerId
    });

    if (!event) {
      throw new Error('Event not found or access denied');
    }

    // Get RSVPed users
    const rsvpUsers = await User.find({
      _id: { $in: event.organizerTools.rsvps.map(r => r.userId) }
    }).select('email profile.name pushSubscriptions');

    // Send email announcements
    const emailPromises = rsvpUsers.map(user =>
      emailService.sendEmail({
        to: user.email,
        subject: `${event.title}: ${announcementData.title}`,
        html: this.generateAnnouncementHTML(event, announcementData),
        text: this.generateAnnouncementText(event, announcementData)
      })
    );

    // Send push notifications
    const pushPromises = rsvpUsers.map(user =>
      this.sendPushAnnouncement(user, event, announcementData)
    );

    await Promise.all([...emailPromises, ...pushPromises]);

    // Record announcement
    event.organizerTools.announcements.push({
      title: announcementData.title,
      message: announcementData.message,
      sentAt: new Date(),
      sentTo: rsvpUsers.length,
      type: announcementData.type || 'update'
    });

    await event.save();

    return {
      message: 'Announcement sent successfully',
      recipients: rsvpUsers.length
    };
  }

  // Get event analytics
  async getEventAnalytics(eventId, organizerId) {
    const event = await Event.findOne({
      _id: eventId,
      userId: organizerId
    });

    if (!event) {
      throw new Error('Event not found or access denied');
    }

    // Calculate current analytics
    await this.updateEventAnalytics(eventId);

    // Get updated event
    const updatedEvent = await Event.findById(eventId)
      .populate('organizerTools.rsvps.userId', 'profile.name email');

    const analytics = updatedEvent.organizerTools.analytics;
    const rsvps = updatedEvent.organizerTools.rsvps;

    return {
      eventTitle: updatedEvent.title,
      analytics: {
        totalViews: analytics.totalViews,
        uniqueViews: analytics.uniqueViews,
        rsvpCount: rsvps.length,
        rsvpRate: analytics.rsvpRate,
        attendingCount: rsvps.filter(r => r.status === 'attending').length,
        maybeCount: rsvps.filter(r => r.status === 'maybe').length,
        notAttendingCount: rsvps.filter(r => r.status === 'not_attending').length,
        totalGuests: rsvps.reduce((sum, r) => sum + r.guestCount, 0),
        attendanceRate: analytics.attendanceRate,
        announcementsSent: updatedEvent.organizerTools.announcements.length
      },
      rsvps: rsvps.map(rsvp => ({
        userId: rsvp.userId._id,
        name: rsvp.userId.profile.name,
        email: rsvp.userId.email,
        status: rsvp.status,
        guestCount: rsvp.guestCount,
        respondedAt: rsvp.respondedAt
      })),
      announcements: updatedEvent.organizerTools.announcements
    };
  }

  // Update event analytics
  async updateEventAnalytics(eventId) {
    const event = await Event.findById(eventId);
    if (!event) return;

    const rsvps = event.organizerTools.rsvps;
    const verifiedAttendees = event.attendance?.verifiedAttendees || [];

    // Calculate rates
    const rsvpRate = rsvps.length > 0 ? (rsvps.filter(r => r.status === 'attending').length / rsvps.length) * 100 : 0;
    const attendanceRate = verifiedAttendees.length > 0 ? (verifiedAttendees.length / rsvps.filter(r => r.status === 'attending').length) * 100 : 0;

    event.organizerTools.analytics.rsvpRate = Math.round(rsvpRate * 100) / 100;
    event.organizerTools.analytics.attendanceRate = Math.round(attendanceRate * 100) / 100;
    event.organizerTools.analytics.lastCalculated = new Date();

    await event.save();
  }

  // Generate certificates for attendees (simplified)
  async generateCertificates(eventId, organizerId) {
    const event = await Event.findOne({
      _id: eventId,
      userId: organizerId
    });

    if (!event) {
      throw new Error('Event not found or access denied');
    }

    const verifiedAttendees = event.attendance?.verifiedAttendees || [];

    // In a real implementation, this would generate PDF certificates
    // For now, return certificate data
    const certificates = verifiedAttendees.map(attendee => ({
      eventId,
      eventTitle: event.title,
      attendeeId: attendee.userId,
      attendedAt: attendee.checkedInAt,
      certificateId: this.generateCertificateId(eventId, attendee.userId),
      issueDate: new Date()
    }));

    return {
      eventTitle: event.title,
      certificatesGenerated: certificates.length,
      certificates
    };
  }

  // Track event views (would be called when event is viewed)
  async trackEventView(eventId, userId = null) {
    const event = await Event.findById(eventId);
    if (!event || !event.organizerTools.isOrganizerEvent) return;

    event.organizerTools.analytics.totalViews += 1;

    // Simple unique view tracking (in production, use proper tracking)
    if (userId && Math.random() < 0.7) { // Simulate unique view detection
      event.organizerTools.analytics.uniqueViews += 1;
    }

    await event.save();
  }

  // Helper: Generate certificate ID
  generateCertificateId(eventId, userId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CERT-${eventId.toString().slice(-6)}-${userId.toString().slice(-6)}-${timestamp}-${random}`.toUpperCase();
  }

  // Helper: Send push announcement
  async sendPushAnnouncement(user, event, announcement) {
    if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) return;

    // Send to all user's subscriptions
    const promises = user.pushSubscriptions.map(subscription =>
      pushService.sendNotification(subscription, {
        title: `${event.title}: ${announcement.title}`,
        body: announcement.message,
        icon: '/icon-192x192.png',
        data: {
          eventId: event._id,
          type: 'announcement'
        }
      })
    );

    await Promise.all(promises);
  }

  // Helper: Generate announcement HTML
  generateAnnouncementHTML(event, announcement) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${event.title} - ${announcement.title}</h2>
        <p><strong>Event Date:</strong> ${event.dateTime.toLocaleDateString()}</p>
        <p><strong>Location:</strong> ${event.location || 'TBD'}</p>

        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          ${announcement.message.replace(/\n/g, '<br>')}
        </div>

        <p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/event/${event._id}"
             style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Event Details
          </a>
        </p>
      </div>
    `;
  }

  // Helper: Generate announcement text
  generateAnnouncementText(event, announcement) {
    return `
${event.title} - ${announcement.title}

Event Date: ${event.dateTime.toLocaleDateString()}
Location: ${event.location || 'TBD'}

${announcement.message}

View event: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/event/${event._id}
    `.trim();
  }
}

module.exports = new OrganizerService();
