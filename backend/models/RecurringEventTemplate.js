const mongoose = require('mongoose');

const recurringEventTemplateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  baseEvent: {
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
    location: {
      type: String,
      trim: true,
      maxlength: 300
    },
    category: {
      type: String,
      enum: ['academic', 'competition', 'webinar', 'social', 'workshop', 'meeting', 'extracurricular'],
      required: true
    },
    priority: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true
    },
    duration: {
      type: Number, // minutes
      default: 60
    },
    preparationNotes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    estimatedPrepTime: {
      type: Number,
      default: 0,
      min: 0
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  },

  recurrence: {
    pattern: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'custom'],
      required: true
    },
    daysOfWeek: [{
      type: Number, // 0=Sunday, 6=Saturday
      min: 0,
      max: 6
    }],
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    skipDates: [Date], // Manual exclusions
    customInterval: {
      type: Number, // For custom patterns
      min: 1
    }
  },

  autoCreateDaysBefore: {
    type: Number,
    default: 7,
    min: 0,
    max: 30
  },

  isActive: {
    type: Boolean,
    default: true
  },

  lastCreatedDate: Date,
  nextCreationDate: Date,

  createdEvents: [{
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    createdDate: Date,
    scheduledDate: Date
  }]
}, {
  timestamps: true
});

// Indexes
recurringEventTemplateSchema.index({ userId: 1, isActive: 1 });
recurringEventTemplateSchema.index({ nextCreationDate: 1 });

module.exports = mongoose.model('RecurringEventTemplate', recurringEventTemplateSchema);
