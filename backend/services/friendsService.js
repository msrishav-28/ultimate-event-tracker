const User = require('../models/User');

class FriendsService {
  // Send friend request
  async sendFriendRequest(fromUserId, toUserId) {
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    if (!fromUser || !toUser) {
      throw new Error('User not found');
    }

    // Check if already friends
    if (fromUser.social.friends.includes(toUserId)) {
      throw new Error('Already friends');
    }

    // Check if request already exists
    const existingRequest = toUser.social.friendRequests.find(
      req => req.from.toString() === fromUserId && req.status === 'pending'
    );

    if (existingRequest) {
      throw new Error('Friend request already sent');
    }

    // Add request
    toUser.social.friendRequests.push({
      from: fromUserId,
      status: 'pending'
    });

    await toUser.save();
    return { message: 'Friend request sent' };
  }

  // Accept friend request
  async acceptFriendRequest(userId, requestId) {
    const user = await User.findById(userId);

    const request = user.social.friendRequests.id(requestId);
    if (!request || request.status !== 'pending') {
      throw new Error('Invalid request');
    }

    const friendId = request.from;

    // Add to friends lists
    user.social.friends.push(friendId);
    await user.save();

    const friend = await User.findById(friendId);
    friend.social.friends.push(userId);
    await friend.save();

    // Remove request
    request.status = 'accepted';
    await user.save();

    return { message: 'Friend request accepted' };
  }

  // Decline friend request
  async declineFriendRequest(userId, requestId) {
    const user = await User.findById(userId);

    const request = user.social.friendRequests.id(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    request.status = 'declined';
    await user.save();

    return { message: 'Friend request declined' };
  }

  // Get friends list
  async getFriends(userId) {
    const user = await User.findById(userId).populate('social.friends', 'profile.name profile.major profile.year profile.department email');
    return user.social.friends;
  }

  // Get pending requests
  async getPendingRequests(userId) {
    const user = await User.findById(userId).populate('social.friendRequests.from', 'profile.name profile.major profile.year');
    return user.social.friendRequests.filter(req => req.status === 'pending');
  }

  // Remove friend
  async removeFriend(userId, friendId) {
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    user.social.friends = user.social.friends.filter(id => id.toString() !== friendId);
    friend.social.friends = friend.social.friends.filter(id => id.toString() !== userId);

    await user.save();
    await friend.save();

    return { message: 'Friend removed' };
  }

  // Get friends' events
  async getFriendsEvents(userId) {
    const user = await User.findById(userId).populate('social.friends');

    const friendIds = user.social.friends.map(f => f._id);

    // Get events from friends that are public or shared with friends
    const Event = require('../models/Event');
    const events = await Event.find({
      userId: { $in: friendIds },
      $or: [
        { isPublic: true },
        { sharedWithFriends: true }
      ],
      dateTime: { $gte: new Date() }
    })
    .populate('userId', 'profile.name')
    .sort({ dateTime: 1 })
    .limit(50);

    return events;
  }
}

module.exports = new FriendsService();
