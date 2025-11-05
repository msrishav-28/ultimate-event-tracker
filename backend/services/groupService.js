const GroupPrepSession = require('../models/GroupPrepSession');
const Event = require('../models/Event');
const User = require('../models/User');

class GroupService {
  // Create study group
  async createGroup(eventId, createdBy, groupData) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const group = new GroupPrepSession({
      eventId,
      createdBy,
      members: [createdBy], // Creator is automatically a member
      ...groupData
    });

    await group.save();

    // Update user's study groups joined
    await User.findByIdAndUpdate(createdBy, {
      $inc: { 'achievements.scores.studyGroupsJoined': 1 }
    });

    return group;
  }

  // Join group
  async joinGroup(groupId, userId) {
    const group = await GroupPrepSession.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.members.includes(userId)) {
      throw new Error('Already a member');
    }

    if (group.members.length >= group.maxMembers) {
      throw new Error('Group is full');
    }

    group.members.push(userId);
    await group.save();

    // Update user's study groups joined
    await User.findByIdAndUpdate(userId, {
      $inc: { 'achievements.scores.studyGroupsJoined': 1 }
    });

    return group;
  }

  // Leave group
  async leaveGroup(groupId, userId) {
    const group = await GroupPrepSession.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (!group.members.includes(userId)) {
      throw new Error('Not a member');
    }

    if (group.createdBy.toString() === userId) {
      throw new Error('Creator cannot leave group');
    }

    group.members = group.members.filter(id => id.toString() !== userId);
    await group.save();

    return group;
  }

  // Get groups for event
  async getEventGroups(eventId) {
    return await GroupPrepSession.find({ eventId, status: 'active' })
      .populate('createdBy', 'profile.name')
      .populate('members', 'profile.name profile.major')
      .sort({ createdAt: -1 });
  }

  // Get user's groups
  async getUserGroups(userId) {
    return await GroupPrepSession.find({
      members: userId,
      status: 'active'
    })
    .populate('eventId', 'title dateTime location')
    .populate('createdBy', 'profile.name')
    .sort({ meetupTime: 1 });
  }

  // Update group
  async updateGroup(groupId, userId, updates) {
    const group = await GroupPrepSession.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.createdBy.toString() !== userId) {
      throw new Error('Only creator can update group');
    }

    Object.assign(group, updates);
    await group.save();

    return group;
  }

  // Cancel group
  async cancelGroup(groupId, userId) {
    const group = await GroupPrepSession.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.createdBy.toString() !== userId) {
      throw new Error('Only creator can cancel group');
    }

    group.status = 'cancelled';
    await group.save();

    return group;
  }

  // Find potential study partners
  async findStudyPartners(eventId, userId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Get users who have this event and are not already friends
    const user = await User.findById(userId);
    const friendIds = user.social.friends.map(f => f._id.toString());

    const potentialPartners = await User.find({
      _id: { $ne: userId, $nin: friendIds },
      'profile.interestAreas': { $in: event.tags || [] }
    })
    .select('profile.name profile.major profile.year profile.department')
    .limit(10);

    return potentialPartners;
  }
}

module.exports = new GroupService();
