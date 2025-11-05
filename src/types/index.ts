export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Category = 'academic' | 'competition' | 'webinar' | 'workshop' | 'meeting' | 'social';
export type ViewMode = 'list' | 'calendar' | 'timeline';

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: Category;
  priority: Priority;
  description: string;
  prepProgress: number;
  reminders: {
    oneWeek: boolean;
    threeDays: boolean;
    oneDay: boolean;
    twoHours: boolean;
  };
  addToCalendar: boolean;
  postToFriends: boolean;
  source?: 'text' | 'voice' | 'image' | 'manual';
  confidence?: number;
  completed?: boolean;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  preparationNotes?: string;
  preparationTasks?: Array<{
    task: string;
    completed: boolean;
    dueDate?: string;
  }>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  year: string;
  department: string;
}

export interface Friend extends User {
  online: boolean;
  lastSeen?: string;
}

export interface StudyGroup {
  id: string;
  eventId: string;
  eventName: string;
  members: number;
  meetingTime: string;
  meetingLocation: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  score: number;
  category: string;
}

export interface AppState {
  currentScreen: 'onboarding' | 'dashboard' | 'calendar' | 'friends' | 'settings';
  user: User | null;
  events: Event[];
  friends: Friend[];
  studyGroups: StudyGroup[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultSort: string;
  defaultView: ViewMode;
  hidePastEvents: boolean;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    defaultReminders: {
      oneWeek: boolean;
      threeDays: boolean;
      oneDay: boolean;
      twoHours: boolean;
    };
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    emailDigest: 'weekly' | 'biweekly' | 'off';
  };
  googleCalendar: {
    connected: boolean;
    email?: string;
  };
}
