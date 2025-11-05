// API service for communicating with backend
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

interface ApiServiceType {
  baseURL: string;
  getAuthHeaders(): { Authorization?: string };
  request(endpoint: string, options?: RequestInit): Promise<any>;
  register(userData: { email: string; password: string; name: string }): Promise<any>;
  login(credentials: { email: string; password: string }): Promise<any>;
  getCurrentUser(): Promise<any>;
  updateProfile(userData: any): Promise<any>;
  changePassword(passwordData: { currentPassword: string; newPassword: string }): Promise<any>;
  getEvents(params?: any): Promise<any>;
  getEvent(id: string): Promise<any>;
  createEvent(eventData: any): Promise<any>;
  updateEvent(id: string, eventData: any): Promise<any>;
  updateEventStatus(id: string, status: string): Promise<any>;
  deleteEvent(id: string): Promise<any>;
  processText(text: string): Promise<any>;
  processVoice(transcript: string): Promise<any>;
  processImage(formData: FormData): Promise<any>;
  getUserPreferences(): Promise<any>;
  updateUserPreferences(preferences: any): Promise<any>;
  exportUserData(format?: string): Promise<any>;
  subscribeToPush(subscription: any): Promise<any>;
  unsubscribeFromPush(endpoint: string): Promise<any>;
  subscribeToPushNotifications(subscription: any): Promise<any>;
  unsubscribeFromPushNotifications(): Promise<any>;
  testPushNotification(): Promise<any>;
  testEmailNotification(): Promise<any>;
  getReminders(): Promise<any>;
  snoozeReminder(reminderId: string, minutes?: number): Promise<any>;
  dismissReminder(reminderId: string): Promise<any>;
  // Google Calendar methods
  getGoogleCalendarStatus(): Promise<any>;
  getGoogleCalendars(): Promise<any>;
  syncWithGoogleCalendar(calendarId: string): Promise<any>;
  exportEventToGoogleCalendar(eventId: string, calendarId: string): Promise<any>;
  importFromGoogleCalendar(calendarId: string, since?: string): Promise<any>;
  disconnectGoogleCalendar(): Promise<any>;
}

class ApiService implements ApiServiceType {
  baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Generic API request method
  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async updateProfile(userData) {
    return this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async changePassword(passwordData) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  // Event methods
  async getEvents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/events?${queryString}`);
  }

  async getEvent(id) {
    return this.request(`/events/${id}`);
  }

  async createEvent(eventData) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(id, eventData) {
    return this.request(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async updateEventStatus(id, status) {
    return this.request(`/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteEvent(id) {
    return this.request(`/events/${id}`, {
      method: 'DELETE',
    });
  }

  // Processing methods
  async processText(text) {
    return this.request('/process/text', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async processVoice(transcript) {
    return this.request('/process/voice', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  }

  async processImage(formData) {
    return this.request('/process/image', {
      method: 'POST',
      body: JSON.stringify(formData), // This would need to be FormData for actual file upload
    });
  }

  // User preferences and data
  async getUserPreferences() {
    return this.request('/users/preferences');
  }

  async updateUserPreferences(preferences) {
    return this.request('/users/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    });
  }

  async exportUserData(format = 'json') {
    return this.request(`/users/export?format=${format}`);
  }

  async subscribeToPush(subscription) {
    return this.request('/users/push-subscription', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    });
  }

  async unsubscribeFromPush(endpoint) {
    return this.request('/users/push-subscription', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    });
  }

  // Reminder methods
  async getReminders() {
    return this.request('/reminders');
  }

  async snoozeReminder(reminderId: string, minutes: number = 30): Promise<any> {
    return this.request(`/reminders/${reminderId}/snooze`, {
      method: 'PATCH',
      body: JSON.stringify({ minutes }),
    });
  }

  async dismissReminder(reminderId: string): Promise<any> {
    return this.request(`/reminders/${reminderId}/dismiss`, {
      method: 'PATCH',
    });
  }

  async subscribeToPushNotifications(subscription: any): Promise<any> {
    return this.request('/users/push-subscription', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    });
  }

  async unsubscribeFromPushNotifications(): Promise<any> {
    return this.request('/users/push-subscription', {
      method: 'DELETE',
    });
  }

  async testPushNotification(): Promise<any> {
    return this.request('/users/test-push', {
      method: 'POST',
    });
  }

  async testEmailNotification(): Promise<any> {
    return this.request('/reminders/test', {
      method: 'POST',
      body: JSON.stringify({ channel: 'email' }),
    });
  }

  // Google Calendar methods
  async getGoogleCalendarStatus(): Promise<any> {
    return this.request('/calendar/status');
  }

  async getGoogleCalendars(): Promise<any> {
    return this.request('/calendar/calendars');
  }

  async syncWithGoogleCalendar(calendarId: string): Promise<any> {
    return this.request('/calendar/sync', {
      method: 'POST',
      body: JSON.stringify({ calendarId }),
    });
  }

  async exportEventToGoogleCalendar(eventId: string, calendarId: string): Promise<any> {
    return this.request(`/calendar/export/${eventId}`, {
      method: 'POST',
      body: JSON.stringify({ calendarId }),
    });
  }

  async importFromGoogleCalendar(calendarId: string, since?: string): Promise<any> {
    return this.request('/calendar/import', {
      method: 'POST',
      body: JSON.stringify({ calendarId, since }),
    });
  }

  async disconnectGoogleCalendar(): Promise<any> {
    return this.request('/calendar/disconnect', {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
