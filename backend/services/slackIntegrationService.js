const { WebClient } = require('@slack/web-api');
const User = require('../models/User');
const Event = require('../models/Event');

class SlackIntegrationService {
  // Post event to Slack channels
  async postEventToSlack(userId, eventId, channels) {
    const user = await User.findById(userId);
    if (!user.integrations.slackIntegration.isActive) {
      throw new Error('Slack integration not active');
    }

    const slack = new WebClient(user.integrations.slackIntegration.botToken);
    const event = await Event.findById(eventId);

    if (!event) {
      throw new Error('Event not found');
    }

    const message = this._buildEventMessage(event);

    try {
      const results = [];
      for (const channel of channels || user.integrations.slackIntegration.channels) {
        const result = await slack.chat.postMessage({
          channel,
          ...message
        });
        results.push(result);
      }

      return {
        success: true,
        postedTo: results.length,
        channels: channels || user.integrations.slackIntegration.channels
      };
    } catch (error) {
      throw new Error('Failed to post to Slack: ' + error.message);
    }
  }

  // Post upcoming events digest
  async postWeeklyDigest(userId) {
    const user = await User.findById(userId);
    if (!user.integrations.slackIntegration.isActive) {
      return; // Skip if not active
    }

    const slack = new WebClient(user.integrations.slackIntegration.botToken);

    // Get upcoming events
    const upcomingEvents = await Event.find({
      userId,
      dateTime: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      }
    }).sort({ dateTime: 1 }).limit(10);

    if (upcomingEvents.length === 0) {
      return; // No events to post
    }

    const message = this._buildDigestMessage(upcomingEvents);

    try {
      for (const channel of user.integrations.slackIntegration.channels) {
        await slack.chat.postMessage({
          channel,
          ...message
        });
      }
    } catch (error) {
      console.error('Failed to post digest to Slack:', error);
    }
  }

  // Connect Slack workspace
  async connectSlack(userId, botToken, channels) {
    try {
      const slack = new WebClient(botToken);

      // Test connection
      await slack.auth.test();

      await User.findByIdAndUpdate(userId, {
        'integrations.slackIntegration.workspaceId': 'workspace', // Would get from API
        'integrations.slackIntegration.botToken': botToken,
        'integrations.slackIntegration.channels': channels,
        'integrations.slackIntegration.isActive': true
      });

      return { success: true, message: 'Slack connected successfully' };
    } catch (error) {
      throw new Error('Failed to connect Slack: ' + error.message);
    }
  }

  // Build event message for Slack
  _buildEventMessage(event) {
    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${event.title}*\n📅 ${event.dateTime.toLocaleDateString()} at ${event.dateTime.toLocaleTimeString()}\n📍 ${event.location}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: event.description ? event.description.substring(0, 300) + (event.description.length > 300 ? '...' : '') : 'No description available'
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Add to Calendar"
              },
              action_id: "add_to_calendar",
              value: event._id.toString()
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View Details"
              },
              action_id: "view_event",
              value: event._id.toString()
            }
          ]
        }
      ]
    };
  }

  // Build weekly digest message
  _buildDigestMessage(events) {
    const eventBlocks = events.map(event => ({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `• *${event.title}* - ${event.dateTime.toLocaleDateString()} ${event.dateTime.toLocaleTimeString()}`
      }
    }));

    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*📅 Weekly Event Digest*\nHere are your upcoming events:"
          }
        },
        ...eventBlocks.slice(0, 5), // Limit to 5 events to avoid message size limits
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View All Events"
              },
              action_id: "view_all_events"
            }
          ]
        }
      ]
    };
  }
}

module.exports = new SlackIntegrationService();
