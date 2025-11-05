const mongoose = require('mongoose');

const groupPrepSessionSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  meetupTime: {
    type: Date,
    required: true
  },
  meetupLocation: {
    type: String,
    trim: true,
    maxlength: 300
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isVirtual: {
    type: Boolean,
    default: false
  },
  maxMembers: {
    type: Number,
    default: 10,
    min: 2,
    max: 50
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active'
  },
  virtualLink: String, // For virtual meetings
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Indexes
groupPrepSessionSchema.index({ eventId: 1, status: 1 });
groupPrepSessionSchema.index({ createdBy: 1 });
groupPrepSessionSchema.index({ meetupTime: 1 });

module.exports = mongoose.model('GroupPrepSession', groupPrepSessionSchema);
