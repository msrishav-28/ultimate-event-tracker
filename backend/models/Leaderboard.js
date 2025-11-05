const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['overall', 'competitive-programming', 'machine-learning', 'web-dev', 'data-science', 'cybersecurity', 'design', 'academic', 'social'],
    required: true,
    index: true
  },
  collegeName: {
    type: String,
    trim: true,
    index: true
  },
  department: {
    type: String,
    trim: true
  },
  rankings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    score: {
      type: Number,
      default: 0,
      min: 0
    },
    rank: {
      type: Number,
      min: 1
    },
    eventsAttended: {
      type: Number,
      default: 0
    },
    badgesEarned: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  lastCalculated: {
    type: Date,
    default: Date.now,
    index: true
  },
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'all-time'],
    default: 'all-time'
  }
}, {
  timestamps: true
});

// Indexes
leaderboardSchema.index({ category: 1, collegeName: 1 });
leaderboardSchema.index({ lastCalculated: -1 });

// Pre-save middleware to update ranks
leaderboardSchema.pre('save', function(next) {
  // Sort rankings by score descending
  this.rankings.sort((a, b) => b.score - a.score);

  // Assign ranks
  this.rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });

  next();
});

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
