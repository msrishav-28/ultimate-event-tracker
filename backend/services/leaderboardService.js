const Leaderboard = require('../models/Leaderboard');
const User = require('../models/User');

class LeaderboardService {
  // Calculate and update leaderboard for a category
  async updateLeaderboard(category, collegeName) {
    // Get all users with events in this category
    const users = await User.find({
      'profile.college': collegeName,
      'statistics.favoriteCategory': category
    }).select('_id profile.name achievements.scores');

    // Calculate scores (simplified)
    const rankings = users.map(user => ({
      userId: user._id,
      score: this.calculateScore(user.achievements.scores, category),
      eventsAttended: user.achievements.scores.eventsAttended || 0,
      badgesEarned: user.achievements.totalBadges || 0
    }));

    // Sort by score descending
    rankings.sort((a, b) => b.score - a.score);

    // Update or create leaderboard
    const leaderboard = await Leaderboard.findOneAndUpdate(
      { category, collegeName },
      {
        rankings,
        lastCalculated: new Date()
      },
      { upsert: true, new: true }
    );

    return leaderboard;
  }

  // Calculate user score for category
  calculateScore(scores, category) {
    let score = 0;

    // Base score from events attended
    score += (scores.eventsAttended || 0) * 10;

    // Category-specific multipliers
    switch (category) {
      case 'competitive-programming':
        score += (scores.competitionsWon || 0) * 50;
        break;
      case 'machine-learning':
        score += (scores.eventsAttended || 0) * 15; // Higher weight
        break;
      case 'academic':
        score += (scores.eventsAttended || 0) * 5; // Lower weight
        break;
      default:
        score += (scores.eventsAttended || 0) * 8;
    }

    // Study groups bonus
    score += (scores.studyGroupsJoined || 0) * 5;

    return Math.round(score);
  }

  // Get leaderboard
  async getLeaderboard(category, collegeName, limit = 50) {
    const leaderboard = await Leaderboard.findOne({ category, collegeName })
      .populate('rankings.userId', 'profile.name profile.major profile.year');

    if (!leaderboard) {
      return [];
    }

    return leaderboard.rankings.slice(0, limit);
  }

  // Get user's rank
  async getUserRank(userId, category, collegeName) {
    const leaderboard = await Leaderboard.findOne({ category, collegeName });

    if (!leaderboard) {
      return null;
    }

    const userRanking = leaderboard.rankings.find(r => r.userId.toString() === userId);
    return userRanking || null;
  }

  // Update user scores (called when achievements change)
  async updateUserScore(userId) {
    const user = await User.findById(userId).select('profile.college achievements.scores');

    if (!user) return;

    // Update all relevant leaderboards
    const categories = ['overall', user.achievements.scores.favoriteCategory].filter(Boolean);

    for (const category of categories) {
      await this.updateLeaderboard(category, user.profile.college);
    }
  }

  // Get top performers by category
  async getTopPerformers(collegeName, limit = 10) {
    const categories = ['competitive-programming', 'machine-learning', 'web-dev', 'data-science'];

    const topPerformers = {};

    for (const category of categories) {
      const leaderboard = await this.getLeaderboard(category, collegeName, limit);
      topPerformers[category] = leaderboard;
    }

    return topPerformers;
  }
}

module.exports = new LeaderboardService();
