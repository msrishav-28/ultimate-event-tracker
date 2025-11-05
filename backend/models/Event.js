const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Core Event Data
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  dateTime: {
    type: Date,
    required: true,
    index: true
  },
  endDateTime: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > this.dateTime;
      },
      message: 'End date must be after start date'
    }
  },
  location: {
    type: String,
    trim: true,
    maxlength: 300
  },

  // Categorization
  category: {
    type: String,
    enum: ['academic', 'competition', 'webinar', 'social', 'workshop', 'meeting', 'extracurricular'],
    required: true,
    index: true
  },
  priority: {
    type: Number,
    enum: [1, 2, 3, 4, 5], // 1=low, 5=critical
    required: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },

  // Extraction Metadata
  sourceType: {
    type: String,
    enum: ['text_manual', 'voice', 'poster_image', 'email'],
    required: true
  },
  extractionMethod: {
    type: String,
    enum: ['manual', 'nlp', 'deepseek-ocr', 'paddle-ocr', 'claude-vision'],
    default: 'manual'
  },
  extractionConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1.0
  },
  rawInput: String, // URL or original text

  // Details
  registrationDeadline: Date,
  registrationFee: {
    type: Number,
    default: 0,
    min: 0
  },
  organizerName: {
    type: String,
    trim: true
  },
  organizerEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  eventLink: {
    type: String,
    trim: true
  },

  // NEW: Smart Prep Checklist
  smartPrepChecklist: {
    items: [{
      task: {
        type: String,
        required: true,
        trim: true
      },
      estimatedTime: {
        type: Number, // minutes
        min: 0
      },
      difficulty: {
        type: String,
        enum: ['easy', 'intermediate', 'advanced'],
        default: 'intermediate'
      },
      resources: [{
        title: String,
        url: String,
        source: {
          type: String,
          enum: ['youtube', 'github', 'leetcode', 'coursework', 'blog']
        },
        type: {
          type: String,
          enum: ['video', 'article', 'problem', 'repository', 'course']
        }
      }],
      optional: {
        type: Boolean,
        default: false
      },
      priority: Number, // 1-5, higher is more important
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: Date
    }],
    totalEstimatedTime: {
      type: Number,
      default: 0
    },
    recommendedStartDate: Date,
    generatedAt: Date,
    lastUpdated: Date
  },

  // NEW: Location-Aware Reminders
  locationAwareReminders: [{
    venue: {
      latitude: Number,
      longitude: Number,
      name: String,
      building: String
    },
    triggerDistance: {
      type: Number,
      default: 500, // meters
      min: 50,
      max: 2000
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastTriggered: Date
  }],

  // Calendar Integration
  googleCalendarId: String,
  googleCalendarSynced: {
    type: Boolean,
    default: false
  },

  // NEW: Social & Sharing
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWithFriends: {
    type: Boolean,
    default: false
  },

  // NEW: Attendance Verification
  attendance: {
    requiresVerification: {
      type: Boolean,
      default: false
    },
    qrCode: String, // Generated QR code for check-in
    verifiedAttendees: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      checkedInAt: Date,
      verificationMethod: {
        type: String,
        enum: ['qr_code', 'manual_approval'],
        default: 'qr_code'
      }
    }]
  },

  // NEW: Recurring Events
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringEventTemplate'
  },

  // NEW: Organizer Tools
  organizerTools: {
    isOrganizerEvent: {
      type: Boolean,
      default: false
    },
    organizerNotes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    rsvps: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['attending', 'maybe', 'not_attending'],
        default: 'attending'
      },
      respondedAt: {
        type: Date,
        default: Date.now
      },
      guestCount: {
        type: Number,
        default: 1,
        min: 1
      }
    }],
    announcements: [{
      title: String,
      message: String,
      sentAt: Date,
      sentTo: Number, // count of recipients
      type: {
        type: String,
        enum: ['reminder', 'update', 'cancellation'],
        default: 'update'
      }
    }],
    analytics: {
      totalViews: {
        type: Number,
        default: 0
      },
      uniqueViews: {
        type: Number,
        default: 0
      },
      rsvpRate: {
        type: Number,
        default: 0
      },
      attendanceRate: {
        type: Number,
        default: 0
      },
      lastCalculated: Date
    }
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for performance
eventSchema.index({ userId: 1, dateTime: 1 });
eventSchema.index({ userId: 1, priority: -1, dateTime: 1 });
eventSchema.index({ userId: 1, category: 1 });
eventSchema.index({ userId: 1, status: 1 });
eventSchema.index({ dateTime: 1 }); // For reminder scheduler
eventSchema.index({ title: 'text', description: 'text', location: 'text' }); // Full-text search

// Virtual for duration in minutes
eventSchema.virtual('duration').get(function() {
  if (!this.endDateTime) return null;
  return Math.round((this.endDateTime - this.dateTime) / (1000 * 60));
});

// Ensure virtual fields are serialized
eventSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
