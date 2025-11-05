class OfflineSyncService {
  constructor() {
    this.pendingActions = [];
    this.isOnline = navigator.onLine;
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Load pending actions from localStorage
    this.loadPendingActions();
  }

  // Add action to pending queue
  addPendingAction(action) {
    const pendingAction = {
      id: Date.now() + Math.random(),
      type: action.type, // 'create_event', 'update_event', 'delete_event'
      payload: action.payload,
      timestamp: new Date(),
      retryCount: 0
    };

    this.pendingActions.push(pendingAction);
    this.savePendingActions();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingActions();
    }

    return pendingAction.id;
  }

  // Sync pending actions when online
  async syncPendingActions() {
    if (!this.isOnline || this.pendingActions.length === 0) return;

    const actionsToSync = [...this.pendingActions];

    for (const action of actionsToSync) {
      try {
        await this.executeAction(action);
        // Remove from pending on success
        this.removePendingAction(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        action.retryCount++;

        // Remove after max retries
        if (action.retryCount >= 3) {
          this.removePendingAction(action.id);
          // Notify user of failed sync
          this.notifySyncFailure(action);
        }
      }
    }

    this.savePendingActions();
  }

  // Execute individual action
  async executeAction(action) {
    const apiUrl = '/api';

    switch (action.type) {
      case 'create_event':
        const response = await fetch(`${apiUrl}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(action.payload)
        });

        if (!response.ok) {
          throw new Error('Failed to create event');
        }

        const createdEvent = await response.json();
        // Update local event list
        this.updateLocalEvent(createdEvent);
        break;

      case 'update_event':
        const updateResponse = await fetch(`${apiUrl}/events/${action.payload.eventId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(action.payload.updates)
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update event');
        }

        const updatedEvent = await updateResponse.json();
        this.updateLocalEvent(updatedEvent);
        break;

      case 'delete_event':
        const deleteResponse = await fetch(`${apiUrl}/events/${action.payload.eventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!deleteResponse.ok) {
          throw new Error('Failed to delete event');
        }

        this.removeLocalEvent(action.payload.eventId);
        break;

      default:
        throw new Error('Unknown action type');
    }
  }

  // Local storage helpers
  savePendingActions() {
    localStorage.setItem('pendingActions', JSON.stringify(this.pendingActions));
  }

  loadPendingActions() {
    const stored = localStorage.getItem('pendingActions');
    if (stored) {
      this.pendingActions = JSON.parse(stored);
    }
  }

  removePendingAction(actionId) {
    this.pendingActions = this.pendingActions.filter(action => action.id !== actionId);
  }

  // Local event management (simplified)
  updateLocalEvent(event) {
    // Update in local state/cache
    // This would integrate with your app's state management
    console.log('Updated local event:', event);
  }

  removeLocalEvent(eventId) {
    // Remove from local state/cache
    console.log('Removed local event:', eventId);
  }

  notifySyncFailure(action) {
    // Show notification to user
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Sync Failed', {
        body: `Failed to sync ${action.type.replace('_', ' ')} after multiple attempts.`,
        icon: '/icon-192x192.png'
      });
    }
  }

  // Get pending actions count
  getPendingCount() {
    return this.pendingActions.length;
  }

  // Clear all pending actions (for testing/admin)
  clearPendingActions() {
    this.pendingActions = [];
    localStorage.removeItem('pendingActions');
  }
}

// Create global instance
window.offlineSync = new OfflineSyncService();

export default OfflineSyncService;
