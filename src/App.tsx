import { AppProvider, useApp } from './context/AppContext';
import { OnboardingScreen } from './components/OnboardingScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { AdvancedSearch } from './components/AdvancedSearch';
import { FriendsScreen } from './components/FriendsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { NotificationSettings } from './components/NotificationSettings';
import { NotificationContainer, useNotifications } from './components/Notification';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { useEffect } from 'react';

function AppContent() {
  const { currentScreen, user, snoozeReminder, dismissReminder } = useApp();
  const { notifications, removeNotification, showReminderNotification } = useNotifications();

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Register service worker for PWA functionality
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration failed, but app still works
      });
    }
  }, []);

  // Handle notification actions
  const handleNotificationAction = async (action: string, notification: any) => {
    try {
      switch (action) {
        case 'view_event':
          // Navigate to event (implement later)
          break;
        case 'snooze_5':
          await snoozeReminder(notification.reminderId, 5);
          break;
        case 'snooze_15':
          await snoozeReminder(notification.reminderId, 15);
          break;
        case 'dismiss':
          await dismissReminder(notification.reminderId);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Notification action failed:', error);
    }
  };

  // Show onboarding if no user
  if (!user) {
    return <OnboardingScreen />;
  }

  // Render current screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'calendar':
        return <CalendarScreen />;
      case 'search':
        return <AdvancedSearch />;
      case 'friends':
        return <FriendsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'notifications':
        return <NotificationSettings />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <>
      {renderCurrentScreen()}
      <NotificationContainer
        notifications={notifications}
        onAction={handleNotificationAction}
        onDismiss={(notification) => removeNotification(notification.id)}
      />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="min-h-screen bg-gray-50">
          <AppContent />
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
}
