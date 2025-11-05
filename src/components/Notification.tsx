import { useState, useEffect } from 'react';
import { X, Clock, Check, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'info' | 'success' | 'warning';
  eventId?: string;
  reminderId?: string;
  timestamp: Date;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  primary?: boolean;
}

interface NotificationProps {
  notification: NotificationItem;
  onAction: (action: string, notification: NotificationItem) => void;
  onDismiss: (notification: NotificationItem) => void;
}

export function Notification({ notification, onAction, onDismiss }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30); // Auto-dismiss in 30 seconds

  useEffect(() => {
    if (timeLeft <= 0) {
      handleDismiss();
      return;
    }

    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(notification), 300);
  };

  const handleAction = (action: string) => {
    onAction(action, notification);
    handleDismiss();
  };

  const getTypeColor = () => {
    switch (notification.type) {
      case 'reminder': return 'border-l-blue-500 bg-blue-50';
      case 'success': return 'border-l-green-500 bg-green-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      case 'info': return 'border-l-gray-500 bg-gray-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 max-w-sm w-full z-50 transform transition-all duration-300 ease-in-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className={`border-l-4 p-4 rounded-lg shadow-lg ${getTypeColor()}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 truncate">
                {notification.title}
              </h4>
              <Badge variant="secondary" className="text-xs">
                {notification.type}
              </Badge>
            </div>

            <p className="text-sm text-gray-700 mb-3">
              {notification.message}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {notification.actions?.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.primary ? "default" : "outline"}
                  onClick={() => handleAction(action.action)}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}

              {!notification.actions && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAction('view')}
                    className="text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('snooze_5')}
                    className="text-xs"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Snooze 5m
                  </Button>
                </>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="ml-2 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Auto-dismiss timer */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>Auto-dismiss in {timeLeft}s</span>
          <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification Manager Hook
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev]);
    return newNotification.id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Handle reminder notifications
  const showReminderNotification = (reminderData: {
    title: string;
    message: string;
    eventId: string;
    reminderId: string;
  }) => {
    const actions: NotificationAction[] = [
      { label: 'View Event', action: 'view_event', primary: true },
      { label: 'Snooze 5m', action: 'snooze_5' },
      { label: 'Snooze 15m', action: 'snooze_15' },
      { label: 'Dismiss', action: 'dismiss' }
    ];

    return addNotification({
      title: reminderData.title,
      message: reminderData.message,
      type: 'reminder',
      eventId: reminderData.eventId,
      reminderId: reminderData.reminderId,
      actions
    });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showReminderNotification
  };
}

// Notification Container Component
export function NotificationContainer({
  notifications,
  onAction,
  onDismiss
}: {
  notifications: NotificationItem[];
  onAction: (action: string, notification: NotificationItem) => void;
  onDismiss: (notification: NotificationItem) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-0 right-0 z-50 space-y-2 p-4">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          notification={notification}
          onAction={onAction}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
