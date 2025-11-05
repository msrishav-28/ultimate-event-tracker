const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  reminderType: {
    type: String,
    enum: ['pre_event', 'custom'],
    default: 'pre_event'
  },
  scheduledFor: {
    type: Date,
    required: true,
    index: true
  },

  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  eventDetails: {
    title: String,
    dateTime: Date,
    location: String,
    customNote: String
  },

  channel: {
    type: String,
    enum: ['browser_push', 'email', 'both'],
    default: 'browser_push'
  },
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed', 'snoozed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  sentAt: Date,
  attempts: {
    type: Number,
    default: 0,
    max: 3
  },
  lastError: String,

  // NEW: ML Optimization
  optimizationReason: String,
  optimizationConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  interactions: {
    opened: Date,
    clicked: Date,
    dismissed: Date,
    snoozed: Date
  },
}, {
  timestamps: true
});

// Index for efficient querying
reminderSchema.index({ scheduledFor: 1, status: 1 });
reminderSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
