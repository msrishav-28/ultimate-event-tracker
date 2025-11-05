// Push Notifications Service
const webpush = require('web-push');

// Configure VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Replace with actual email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

class PushNotificationService {
  constructor() {
    this.subscriptions = new Map(); // userId -> subscription
  }

  // Store user push subscription
  storeSubscription(userId, subscription) {
    this.subscriptions.set(userId, subscription);
    console.log(`Stored push subscription for user ${userId}`);
  }

  // Remove user push subscription
  removeSubscription(userId) {
    this.subscriptions.delete(userId);
    console.log(`Removed push subscription for user ${userId}`);
  }

  // Send push notification to specific user
  async sendNotification(userId, notification) {
    const subscription = this.subscriptions.get(userId);

    if (!subscription) {
      console.log(`No push subscription found for user ${userId}`);
      return { success: false, error: 'No subscription found' };
    }

    try {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: {
          eventId: notification.eventId,
          reminderId: notification.reminderId,
          action: 'view_event'
        },
        actions: [
          {
            action: 'view',
            title: 'View Event'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      });

      const result = await webpush.sendNotification(subscription, payload);
      console.log(`Push notification sent successfully to user ${userId}`);
      return { success: true, result };

    } catch (error) {
      console.error(`Failed to send push notification to user ${userId}:`, error);

      // If subscription is invalid, remove it
      if (error.statusCode === 410 || error.statusCode === 400) {
        this.removeSubscription(userId);
      }

      return { success: false, error: error.message };
    }
  }

  // Send reminder notification
  async sendReminderNotification(userId, reminderData) {
    const notification = {
      title: reminderData.title || 'Event Reminder',
      body: reminderData.message || 'You have an upcoming event',
      eventId: reminderData.eventId,
      reminderId: reminderData.reminderId
    };

    return await this.sendNotification(userId, notification);
  }

  // Broadcast to multiple users (for future group features)
  async broadcastNotification(userIds, notification) {
    const results = [];

    for (const userId of userIds) {
      const result = await this.sendNotification(userId, notification);
      results.push({ userId, ...result });
    }

    return results;
  }

  // Test notification (for debugging)
  async sendTestNotification(userId) {
    const testNotification = {
      title: 'Test Notification',
      body: 'This is a test push notification from College Event Tracker',
      eventId: null,
      reminderId: null
    };

    return await this.sendNotification(userId, testNotification);
  }

  // Get subscription status for user
  hasSubscription(userId) {
    return this.subscriptions.has(userId);
  }

  // Get all active subscriptions (for debugging)
  getSubscriptionCount() {
    return this.subscriptions.size;
  }
}

module.exports = new PushNotificationService();
