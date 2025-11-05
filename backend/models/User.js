const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    college: {
      type: String,
      default: 'College Name'
    },
    year: {
      type: String,
      enum: ['freshman', 'sophomore', 'junior', 'senior', 'graduate'],
      default: 'freshman'
    },
    major: { // NEW: More specific than department
      type: String,
      default: 'Computer Science'
    },
    department: {
      type: String,
      default: 'Department'
    },
    interestAreas: [{
      type: String,
      enum: ['competitive-programming', 'machine-learning', 'web-dev', 'data-science', 'cybersecurity', 'design', 'other']
    }]
  },

  // NEW: Social Features
  social: {
    friends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    publicEvents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    }],
    privacy: {
      type: String,
      enum: ['private', 'friends_only', 'public'],
      default: 'friends_only'
    },
    friendRequests: [{
      from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // NEW: Achievements & Gamification
  achievements: {
    badges: [{
      id: String,
      name: String,
      icon: String,
      description: String,
      earnedAt: Date
    }],
    totalBadges: {
      type: Number,
      default: 0
    },
    leaderboardRank: {
      overall: Number,
      byCategory: Map,
      lastUpdated: Date
    },
    scores: {
      eventsAttended: { type: Number, default: 0 },
      competitionsWon: { type: Number, default: 0 },
      studyGroupsJoined: { type: Number, default: 0 },
      eventsCreated: { type: Number, default: 0 }
    }
  },
  preferences: {
    defaultReminderTimes: [{
      type: Number, // seconds before event
      default: [604800, 259200, 86400, 7200] // 1w, 3d, 1d, 2h
    }],
    notificationChannel: {
      type: String,
      enum: ['browser_push', 'email', 'both'],
      default: 'browser_push'
    },
    interestedCategories: [{
      type: String,
      enum: ['academic', 'competition', 'webinar', 'workshop', 'social', 'meeting', 'extracurricular'],
      default: ['academic', 'competition', 'webinar']
    }],
    defaultSort: {
      type: String,
      enum: ['by_relevance', 'by_date', 'by_priority'],
      default: 'by_relevance'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'dark'
    },
    // NEW: Location & Privacy
    locationTrackingEnabled: {
      type: Boolean,
      default: false
    },
    locationSharing: {
      type: String,
      enum: ['disabled', 'friends_only', 'public'],
      default: 'disabled'
    }
  },
  integrations: {
    googleCalendar: {
      connected: {
        type: Boolean,
        default: false
      },
      accessToken: String,
      refreshToken: String,
      calendarId: String
    },
    // NEW: Email Integration
    emailIntegration: {
      gmailConnected: {
        type: Boolean,
        default: false
      },
      accessToken: String,
      refreshToken: String,
      autoImportEnabled: {
        type: Boolean,
        default: false
      },
      emailFilters: {
        senders: [{
          type: String,
          trim: true
        }],
        keywords: [{
          type: String,
          trim: true,
          lowercase: true
        }],
        minConfidence: {
          type: Number,
          min: 0,
          max: 1,
          default: 0.75
        }
      },
      importedEventCount: {
        type: Number,
        default: 0
      },
      lastScanDate: Date
    },
    // NEW: Slack Integration
    slackIntegration: {
      workspaceId: String,
      botToken: String,
      channels: [{
        type: String,
        trim: true
      }],
      isActive: {
        type: Boolean,
        default: false
      }
    }
  },
  statistics: {
    totalEventsCreated: {
      type: Number,
      default: 0
    },
    eventsAttended: {
      type: Number,
      default: 0
    },
    averagePrep: {
      type: Number, // minutes
      default: 0
    },
    favoriteCategory: {
      type: String,
      enum: ['academic', 'competition', 'webinar', 'workshop', 'social', 'meeting', 'extracurricular']
    }
  },
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    },
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.integrations.googleCalendar.accessToken;
  delete userObject.integrations.googleCalendar.refreshToken;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
