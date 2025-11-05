const Event = require('../models/Event');
const User = require('../models/User');
const QRCode = require('qrcode');

class AttendanceService {
  // Generate QR code for event check-in
  async generateEventQR(eventId, userId) {
    const event = await Event.findOne({
      _id: eventId,
      userId: userId // Only event creator can generate QR
    });

    if (!event) {
      throw new Error('Event not found or access denied');
    }

    // Generate unique QR code data
    const qrData = {
      eventId: event._id.toString(),
      eventTitle: event.title,
      timestamp: Date.now(),
      checkInToken: this.generateCheckInToken()
    };

    // Create QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));

    // Update event with QR code
    event.attendance.qrCode = qrCodeDataURL;
    event.attendance.requiresVerification = true;
    await event.save();

    return {
      qrCode: qrCodeDataURL,
      qrData: qrData
    };
  }

  // Check-in attendee via QR code
  async checkInAttendee(eventId, userId, qrData) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Validate QR data
    if (!this.validateQRData(qrData, event)) {
      throw new Error('Invalid QR code');
    }

    // Check if user already checked in
    const existingCheckIn = event.attendance.verifiedAttendees.find(
      attendee => attendee.userId.toString() === userId
    );

    if (existingCheckIn) {
      throw new Error('Already checked in');
    }

    // Add attendee
    event.attendance.verifiedAttendees.push({
      userId: userId,
      checkedInAt: new Date(),
      verificationMethod: 'qr_code'
    });

    await event.save();

    // Award achievements and update user stats
    await this.awardAttendanceAchievements(userId, event);

    return {
      message: 'Check-in successful',
      eventTitle: event.title,
      checkInTime: new Date()
    };
  }

  // Manual check-in (for organizers)
  async manualCheckIn(eventId, organizerId, attendeeEmail) {
    const event = await Event.findOne({
      _id: eventId,
      userId: organizerId
    });

    if (!event) {
      throw new Error('Event not found or access denied');
    }

    // Find user by email
    const attendee = await User.findOne({ email: attendeeEmail });
    if (!attendee) {
      throw new Error('User not found');
    }

    // Check if already checked in
    const existingCheckIn = event.attendance.verifiedAttendees.find(
      checkIn => checkIn.userId.toString() === attendee._id.toString()
    );

    if (existingCheckIn) {
      throw new Error('User already checked in');
    }

    // Add attendee
    event.attendance.verifiedAttendees.push({
      userId: attendee._id,
      checkedInAt: new Date(),
      verificationMethod: 'manual_approval'
    });

    await event.save();

    // Award achievements
    await this.awardAttendanceAchievements(attendee._id, event);

    return {
      message: 'Manual check-in successful',
      attendeeName: attendee.profile.name,
      eventTitle: event.title
    };
  }

  // Validate QR code data
  validateQRData(qrData, event) {
    try {
      // Check if QR data matches event
      if (qrData.eventId !== event._id.toString()) {
        return false;
      }

      // Check timestamp (QR codes expire after 24 hours)
      const qrAge = Date.now() - qrData.timestamp;
      if (qrAge > 24 * 60 * 60 * 1000) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Generate unique check-in token
  generateCheckInToken() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  // Award attendance achievements
  async awardAttendanceAchievements(userId, event) {
    const user = await User.findById(userId);
    if (!user) return;

    // Update attendance stats
    user.achievements.scores.eventsAttended += 1;
    user.statistics.totalEventsAttended += 1;
    user.statistics.eventsAttended += 1;

    // Award badges based on attendance milestones
    const badges = [];

    // Rookie badge (first event)
    if (user.achievements.scores.eventsAttended === 1) {
      badges.push(this.createBadge('Rookie', '🏆', 'Attended first event'));
    }

    // Event Enthusiast (10 events)
    if (user.achievements.scores.eventsAttended === 10) {
      badges.push(this.createBadge('Event Enthusiast', '🎖️', 'Attended 10 events'));
    }

    // Category-specific badges
    if (event.category === 'competition') {
      user.achievements.scores.competitionsWon += 1;
      if (user.achievements.scores.competitionsWon === 1) {
        badges.push(this.createBadge('Competition Rookie', '🥇', 'Attended first competition'));
      }
      if (user.achievements.scores.competitionsWon === 5) {
        badges.push(this.createBadge('Competition Champion', '🏆', 'Attended 5 competitions'));
      }
    }

    // Streaks and special achievements
    await this.checkAttendanceStreaks(userId);

    // Add new badges to user
    user.achievements.badges.push(...badges);
    user.achievements.totalBadges += badges.length;

    await user.save();

    return badges;
  }

  // Check for attendance streaks
  async checkAttendanceStreaks(userId) {
    const user = await User.findById(userId);

    // Get recent attendance history (last 60 days)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const recentAttendance = await Event.find({
      'attendance.verifiedAttendees.userId': userId,
      dateTime: { $gte: sixtyDaysAgo, $lte: new Date() }
    }).sort({ dateTime: 1 });

    // Calculate current streak
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    // Group by weeks
    const weeklyAttendance = {};
    recentAttendance.forEach(event => {
      const weekKey = this.getWeekKey(event.dateTime);
      weeklyAttendance[weekKey] = (weeklyAttendance[weekKey] || 0) + 1;
    });

    // Check weekly streaks
    const sortedWeeks = Object.keys(weeklyAttendance).sort();
    for (let i = 0; i < sortedWeeks.length; i++) {
      if (weeklyAttendance[sortedWeeks[i]] > 0) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);

        // Check if this is the current week
        const currentWeek = this.getWeekKey(new Date());
        if (sortedWeeks[i] === currentWeek) {
          currentStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    // Award streak badges
    const streakBadges = [];

    if (currentStreak >= 4) {
      streakBadges.push(this.createBadge('Streaker (Month)', '🔥', 'Attended events 4+ weeks in a row'));
    }

    if (maxStreak >= 8) {
      streakBadges.push(this.createBadge('Consistency King', '👑', 'Attended events for 8+ consecutive weeks'));
    }

    if (streakBadges.length > 0) {
      user.achievements.badges.push(...streakBadges);
      user.achievements.totalBadges += streakBadges.length;
      await user.save();
    }
  }

  // Create badge object
  createBadge(name, icon, description) {
    return {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      icon,
      description,
      earnedAt: new Date()
    };
  }

  // Get week key for streak calculation
  getWeekKey(date) {
    const year = date.getFullYear();
    const weekNum = this.getWeekNumber(date);
    return `${year}-W${weekNum}`;
  }

  // Get ISO week number
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Get event attendance stats
  async getEventAttendance(eventId, organizerId) {
    const event = await Event.findOne({
      _id: eventId,
      userId: organizerId
    });

    if (!event) {
      throw new Error('Event not found or access denied');
    }

    const attendees = await User.populate(event.attendance.verifiedAttendees, {
      path: 'userId',
      select: 'profile.name profile.major email'
    });

    return {
      eventTitle: event.title,
      totalAttendees: event.attendance.verifiedAttendees.length,
      attendees: event.attendance.verifiedAttendees.map(attendee => ({
        name: attendee.userId.profile.name,
        major: attendee.userId.profile.major,
        email: attendee.userId.email,
        checkedInAt: attendee.checkedInAt,
        method: attendee.verificationMethod
      }))
    };
  }

  // Get user's attendance history and badges
  async getUserAttendanceProfile(userId) {
    const user = await User.findById(userId).select('achievements statistics profile');

    return {
      totalEventsAttended: user.achievements.scores.eventsAttended,
      competitionsAttended: user.achievements.scores.competitionsWon,
      badges: user.achievements.badges,
      totalBadges: user.achievements.totalBadges,
      favoriteCategory: user.statistics.favoriteCategory,
      attendanceRate: user.statistics.totalEventsCreated > 0 ?
        (user.statistics.eventsAttended / user.statistics.totalEventsCreated * 100).toFixed(1) : 0
    };
  }
}

module.exports = new AttendanceService();
