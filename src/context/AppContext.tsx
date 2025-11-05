import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, Event, Friend, StudyGroup, UserPreferences, User } from '../types';
import { apiService } from '../utils/apiService';

interface AppContextType extends AppState {
  // UI state
  setCurrentScreen: (screen: AppState['currentScreen']) => void;

  // Authentication
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Events
  setUser: (user: User | null) => void;
  loadEvents: (params?: any) => Promise<void>;
  addEvent: (event: Partial<Event>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updateEventStatus: (id: string, status: Event['status']) => Promise<void>;

  // User management
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  updateProfile: (profileData: any) => Promise<void>;
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) => Promise<void>;

  // Notifications & Reminders
  subscribeToPushNotifications: () => Promise<void>;
  unsubscribeFromPushNotifications: () => Promise<void>;
  testPushNotification: () => Promise<void>;
  testEmailNotification: () => Promise<void>;
  snoozeReminder: (reminderId: string, minutes: number) => Promise<void>;
  dismissReminder: (reminderId: string) => Promise<void>;

  // Google Calendar methods
  getGoogleCalendarStatus: () => Promise<any>;
  getGoogleCalendars: () => Promise<any>;
  syncWithGoogleCalendar: (calendarId: string) => Promise<any>;
  exportEventToGoogleCalendar: (eventId: string, calendarId: string) => Promise<any>;
  importFromGoogleCalendar: (calendarId: string, since?: string) => Promise<any>;
  disconnectGoogleCalendar: () => Promise<any>;

  // Error handling
  error: string | null;
  clearError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Default preferences
const defaultPreferences: UserPreferences = {
  defaultSort: 'relevance',
  defaultView: 'list',
  hidePastEvents: true,
  theme: 'dark',
  notifications: {
    defaultReminders: {
      oneWeek: true,
      threeDays: true,
      oneDay: true,
      twoHours: true,
    },
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
    },
    emailDigest: 'weekly',
  },
  googleCalendar: {
    connected: false,
  },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<AppState['currentScreen']>('onboarding');
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [studyGroups] = useState<StudyGroup[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Additional state for API integration
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize app - check for existing auth token
  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('auth_token');

      if (token) {
        try {
          // Verify token and get user data
          const response = await apiService.getCurrentUser();
          setUser(response.user);
          setPreferences({ ...defaultPreferences, ...response.user.preferences });
          setIsAuthenticated(true);
          setCurrentScreen('dashboard');

          // Load initial data
          await loadEvents();
        } catch (err) {
          console.error('Token verification failed:', err);
          localStorage.removeItem('auth_token');
          setCurrentScreen('onboarding');
        }
      } else {
        setCurrentScreen('onboarding');
      }

      setIsLoading(false);
    };

    initApp();
  }, []);

  // Helper to clear error
  const clearError = () => setError(null);

  // Helper to handle API errors
  const handleApiError = (error: any) => {
    const message = error.message || 'An error occurred';
    setError(message);
    throw error;
  };

  // Authentication methods
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      clearError();

      const response = await apiService.login({ email, password });

      localStorage.setItem('auth_token', response.token);
      setUser(response.user);
      setPreferences({ ...defaultPreferences, ...response.user.preferences });
      setIsAuthenticated(true);
      setCurrentScreen('dashboard');

      // Load initial data
      await loadEvents();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; name: string }) => {
    try {
      setIsLoading(true);
      clearError();

      const response = await apiService.register(userData);

      localStorage.setItem('auth_token', response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      setCurrentScreen('dashboard');
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setEvents([]);
    setIsAuthenticated(false);
    setCurrentScreen('onboarding');
    clearError();
  };

  // Event methods
  const loadEvents = async (params = {}) => {
    try {
      const response = await apiService.getEvents(params);
      // Transform backend events to frontend format
      const transformedEvents = response.events.map(transformEventFromBackend);
      setEvents(transformedEvents);
    } catch (error) {
      handleApiError(error);
    }
  };

  const addEvent = async (eventData: Partial<Event>) => {
    try {
      clearError();
      const transformedData = transformEventToBackend(eventData);
      const response = await apiService.createEvent(transformedData);
      const newEvent = transformEventFromBackend(response.event);
      setEvents(prev => [...prev, newEvent]);
    } catch (error) {
      handleApiError(error);
    }
  };

  const addFriend = (friend: Friend) => {
    setFriends(prev => [...prev, friend]);
  };

  const updateEvent = async (id: string, updates: Partial<Event>) => {
    try {
      clearError();
      const transformedUpdates = transformEventToBackend(updates);
      const response = await apiService.updateEvent(id, transformedUpdates);
      const updatedEvent = transformEventFromBackend(response.event);
      setEvents(prev =>
        prev.map(event => event.id === id ? updatedEvent : event)
      );
    } catch (error) {
      handleApiError(error);
    }
  };

  const updateEventStatus = async (id: string, status: Event['status']) => {
    try {
      clearError();
      await apiService.updateEventStatus(id, status);
      setEvents(prev =>
        prev.map(event => event.id === id ? { ...event, status } : event)
      );
    } catch (error) {
      handleApiError(error);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      clearError();
      await apiService.deleteEvent(id);
      setEvents(prev => prev.filter(event => event.id !== id));
    } catch (error) {
      handleApiError(error);
    }
  };

  // User management
  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      clearError();
      await apiService.updateUserPreferences(newPreferences);
      setPreferences(prev => ({ ...prev, ...newPreferences }));
    } catch (error) {
      handleApiError(error);
    }
  };

  const updateProfile = async (profileData: any) => {
    try {
      clearError();
      const response = await apiService.updateProfile(profileData);
      setUser(response.user);
    } catch (error) {
      handleApiError(error);
    }
  };

  const changePassword = async (passwordData: { currentPassword: string; newPassword: string }) => {
    try {
      clearError();
      await apiService.changePassword(passwordData);
    } catch (error) {
      handleApiError(error);
    }
  };

  // Processing methods
  const processText = async (text: string) => {
    try {
      clearError();
      return await apiService.processText(text);
    } catch (error) {
      handleApiError(error);
    }
  };

  const processVoice = async (transcript: string) => {
    try {
      clearError();
      return await apiService.processVoice(transcript);
    } catch (error) {
      handleApiError(error);
    }
  };

  const processImage = async (file: File) => {
    try {
      clearError();
      const formData = new FormData();
      formData.append('image', file);
      return await apiService.processImage(formData);
    } catch (error) {
      handleApiError(error);
    }
  };

  // Friends
  const addFriend = (friend: Friend) => {
    setFriends(prev => [...prev, friend]);
  };

  // Push notification methods
  const subscribeToPushNotifications = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications not supported in this browser');
      }

      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Push notification permission denied');
      }

      // Subscribe to push notifications
      const vapidKey = urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY || '');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });

      // Send subscription to backend
      await apiService.subscribeToPushNotifications(subscription);

    } catch (error) {
      console.error('Push subscription failed:', error);
      handleApiError(error);
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await apiService.unsubscribeFromPushNotifications();
      }
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      handleApiError(error);
    }
  };

  const testPushNotification = async () => {
    try {
      await apiService.testPushNotification();
    } catch (error) {
      handleApiError(error);
    }
  };

  const testEmailNotification = async () => {
    try {
      await apiService.testEmailNotification();
    } catch (error) {
      handleApiError(error);
    }
  };

  const snoozeReminder = async (reminderId: string, minutes: number) => {
    try {
      await apiService.snoozeReminder(reminderId, minutes);
    } catch (error) {
      handleApiError(error);
    }
  };

  const dismissReminder = async (reminderId: string) => {
    try {
      await apiService.dismissReminder(reminderId);
    } catch (error) {
      handleApiError(error);
    }
  };

  // Google Calendar methods
  const getGoogleCalendarStatus = async () => {
    try {
      return await apiService.getGoogleCalendarStatus();
    } catch (error) {
      handleApiError(error);
    }
  };

  const getGoogleCalendars = async () => {
    try {
      return await apiService.getGoogleCalendars();
    } catch (error) {
      handleApiError(error);
    }
  };

  const syncWithGoogleCalendar = async (calendarId: string) => {
    try {
      return await apiService.syncWithGoogleCalendar(calendarId);
    } catch (error) {
      handleApiError(error);
    }
  };

  const exportEventToGoogleCalendar = async (eventId: string, calendarId: string) => {
    try {
      return await apiService.exportEventToGoogleCalendar(eventId, calendarId);
    } catch (error) {
      handleApiError(error);
    }
  };

  const importFromGoogleCalendar = async (calendarId: string, since?: string) => {
    try {
      return await apiService.importFromGoogleCalendar(calendarId, since);
    } catch (error) {
      handleApiError(error);
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      return await apiService.disconnectGoogleCalendar();
    } catch (error) {
      handleApiError(error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        // UI state
        currentScreen,
        setCurrentScreen,

        // Data state
        user,
        events,
        friends,
        studyGroups,
        preferences,

        // Auth state
        isAuthenticated,
        isLoading,
        error,

        // Auth methods
        login,
        register,
        logout,
        setUser,

        // Event methods
        loadEvents,
        addEvent,
        updateEvent,
        updateEventStatus,
        deleteEvent,

        // User methods
        updatePreferences,
        updateProfile,
        changePassword,

        // Processing methods
        processText,
        processVoice,
        processImage,

        // Push notification methods
        subscribeToPushNotifications,
        unsubscribeFromPushNotifications,
        testPushNotification,
        testEmailNotification,
        snoozeReminder,
        dismissReminder,

        // Google Calendar methods
        getGoogleCalendarStatus,
        getGoogleCalendars,
        syncWithGoogleCalendar,
        exportEventToGoogleCalendar,
        importFromGoogleCalendar,
        disconnectGoogleCalendar,

        // Friends
        addFriend,

        // Error handling
        clearError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Helper functions to transform data between frontend and backend formats
function transformEventFromBackend(backendEvent: any): Event {
  return {
    id: backendEvent._id,
    title: backendEvent.title,
    date: backendEvent.dateTime.split('T')[0],
    time: backendEvent.dateTime.split('T')[1]?.substring(0, 5) || '00:00',
    location: backendEvent.location || '',
    category: backendEvent.category,
    priority: ['low', 'low', 'medium', 'high', 'critical'][backendEvent.priority - 1] || 'medium' as Priority,
    description: backendEvent.description || '',
    prepProgress: calculatePrepProgress(backendEvent.preparationTasks || []),
    reminders: {
      oneWeek: backendEvent.reminders?.some((r: any) => r.triggeredBefore === 604800) || false,
      threeDays: backendEvent.reminders?.some((r: any) => r.triggeredBefore === 259200) || false,
      oneDay: backendEvent.reminders?.some((r: any) => r.triggeredBefore === 86400) || false,
      twoHours: backendEvent.reminders?.some((r: any) => r.triggeredBefore === 7200) || false,
    },
    addToCalendar: backendEvent.googleCalendarSynced || false,
    postToFriends: false, // TODO: implement
    status: backendEvent.status,
    preparationNotes: backendEvent.preparationNotes,
    preparationTasks: backendEvent.preparationTasks || [],
  };
}

function transformEventToBackend(frontendEvent: Partial<Event>): any {
  const backendEvent: any = {};

  if (frontendEvent.title) backendEvent.title = frontendEvent.title;
  if (frontendEvent.description) backendEvent.description = frontendEvent.description;
  if (frontendEvent.date && frontendEvent.time) {
    backendEvent.dateTime = new Date(`${frontendEvent.date}T${frontendEvent.time}:00Z`);
  }
  if (frontendEvent.location) backendEvent.location = frontendEvent.location;
  if (frontendEvent.category) backendEvent.category = frontendEvent.category;
  if (frontendEvent.priority) {
    backendEvent.priority = { low: 1, medium: 3, high: 4, critical: 5 }[frontendEvent.priority] || 3;
  }
  if (frontendEvent.status) backendEvent.status = frontendEvent.status;
  if (frontendEvent.preparationNotes) backendEvent.preparationNotes = frontendEvent.preparationNotes;
  if (frontendEvent.preparationTasks) backendEvent.preparationTasks = frontendEvent.preparationTasks;

  // Transform reminders
  if (frontendEvent.reminders) {
    backendEvent.reminders = [];
    if (frontendEvent.reminders.oneWeek) {
      backendEvent.reminders.push({ triggeredBefore: 604800, channel: 'browser_push', isActive: true });
    }
    if (frontendEvent.reminders.threeDays) {
      backendEvent.reminders.push({ triggeredBefore: 259200, channel: 'browser_push', isActive: true });
    }
    if (frontendEvent.reminders.oneDay) {
      backendEvent.reminders.push({ triggeredBefore: 86400, channel: 'browser_push', isActive: true });
    }
    if (frontendEvent.reminders.twoHours) {
      backendEvent.reminders.push({ triggeredBefore: 7200, channel: 'browser_push', isActive: true });
    }
  }

  return backendEvent;
}

function calculatePrepProgress(tasks: any[]): number {
  if (!tasks.length) return 0;
  const completed = tasks.filter(task => task.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

// Helper function for push notification subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
