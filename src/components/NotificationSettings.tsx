import { useState, useEffect } from 'react';
import { Bell, Mail, Clock, Smartphone, TestTube, CheckCircle, XCircle, Calendar, RefreshCw, Download, Upload } from 'lucide-react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Sheet, SheetContent } from './ui/sheet';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { useApp } from '../context/AppContext';
import { toast } from 'sonner@2.0.3';

export function NotificationSettings() {
  const {
    preferences,
    updatePreferences,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    testPushNotification,
    testEmailNotification,
    getGoogleCalendarStatus,
    getGoogleCalendars,
    syncWithGoogleCalendar,
    disconnectGoogleCalendar,
    isAuthenticated
  } = useApp();

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // Google Calendar state
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<any>(null);
  const [googleCalendars, setGoogleCalendars] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  // Load Google Calendar status on component mount
  useEffect(() => {
    loadGoogleCalendarStatus();
  }, []);

  const loadGoogleCalendarStatus = async () => {
    try {
      const status = await getGoogleCalendarStatus();
      setGoogleCalendarStatus(status);
    } catch (error) {
      console.error('Failed to load Google Calendar status:', error);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    setIsConnectingGoogle(true);
    try {
      // Generate OAuth URL and redirect
      const response = await fetch('/api/calendar/auth-url', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        window.location.href = authUrl; // Redirect to Google OAuth
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      toast.error('Failed to connect Google Calendar');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      await disconnectGoogleCalendar();
      setGoogleCalendarStatus({ connected: false });
      setGoogleCalendars([]);
      setSelectedCalendarId('');
      toast.success('Google Calendar disconnected');
    } catch (error) {
      console.error('Failed to disconnect Google Calendar:', error);
      toast.error('Failed to disconnect Google Calendar');
    }
  };

  const loadGoogleCalendars = async () => {
    setIsLoadingCalendars(true);
    try {
      const response = await getGoogleCalendars();
      setGoogleCalendars(response.calendars || []);

      // Auto-select primary calendar
      const primaryCalendar = response.calendars?.find((cal: any) => cal.primary);
      if (primaryCalendar) {
        setSelectedCalendarId(primaryCalendar.id);
      }
    } catch (error) {
      console.error('Failed to load calendars:', error);
      toast.error('Failed to load Google Calendars');
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const handleSyncWithGoogleCalendar = async () => {
    if (!selectedCalendarId) {
      toast.error('Please select a calendar to sync');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncWithGoogleCalendar(selectedCalendarId);
      toast.success(result.message || 'Sync completed successfully');

      // Reload calendar status to get updated last sync time
      await loadGoogleCalendarStatus();
    } catch (error) {
      console.error('Failed to sync with Google Calendar:', error);
      toast.error('Failed to sync with Google Calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePreferenceChange = async (key: string, value: any) => {
    try {
      await updatePreferences({
        notifications: {
          ...preferences.notifications,
          [key]: value
        }
      });
      toast.success('Notification preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
    }
  };

  const handlePushSubscription = async () => {
    setIsSubscribing(true);
    try {
      await subscribeToPushNotifications();
      toast.success('Push notifications enabled!');
    } catch (error) {
      toast.error('Failed to enable push notifications');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handlePushUnsubscription = async () => {
    setIsSubscribing(true);
    try {
      await unsubscribeFromPushNotifications();
      toast.success('Push notifications disabled');
    } catch (error) {
      toast.error('Failed to disable push notifications');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestPush = async () => {
    setIsTestingPush(true);
    try {
      await testPushNotification();
      toast.success('Test push notification sent!');
    } catch (error) {
      toast.error('Failed to send test push notification');
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      await testEmailNotification();
      toast.success('Test email sent! Check your inbox.');
    } catch (error) {
      toast.error('Failed to send test email');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setShowMobileSidebar(true)} />

      <div className="flex max-w-[1920px] mx-auto">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar onAddEvent={() => {}} filters={{ categories: [], priorities: [] }} onFilterChange={() => {}} />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar onAddEvent={() => {}} filters={{ categories: [], priorities: [] }} onFilterChange={() => {}} />
          </SheetContent>
        </Sheet>

            </div>
          )}

      {/* Browser Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Browser Push Notifications
          </CardTitle>
          <CardDescription>
            Get notified about upcoming events directly in your browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Browser Push Notifications</p>
              <p className="text-sm text-gray-600">
                Get notified about upcoming events directly in your browser
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestPush}
                disabled={isTestingPush || !isPushSupported}
              >
                <TestTube className="w-4 h-4 mr-2" />
                {isTestingPush ? 'Testing...' : 'Test'}
              </Button>
              <Button
                onClick={handlePushSubscription}
                disabled={isSubscribing || !isPushSupported}
              >
                {isSubscribing ? 'Enabling...' : 'Enable'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Receive detailed reminders via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Reminders</p>
              <p className="text-sm text-gray-600">
                Get comprehensive event details sent to your email
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestEmail}
              disabled={isTestingEmail}
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isTestingEmail ? 'Sending...' : 'Test Email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Sync your events with Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleCalendarStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Connected to Google Calendar</p>
                    <p className="text-sm text-green-600">
                      {googleCalendarStatus.lastSync
                        ? `Last synced: ${new Date(googleCalendarStatus.lastSync).toLocaleString()}`
                        : 'Not synced yet'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectGoogleCalendar}
                >
                  Disconnect
                </Button>
              </div>

              {/* Calendar Selection */}
              <div className="space-y-2">
                <Label>Google Calendar to Sync With</Label>
                <div className="flex gap-2">
                  <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      {googleCalendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          {calendar.summary} {calendar.primary ? '(Primary)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={loadGoogleCalendars}
                    disabled={isLoadingCalendars}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingCalendars ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Sync Options */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSyncWithGoogleCalendar}
                  disabled={isSyncing || !selectedCalendarId}
                  className="flex-1"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>• Events with "Add to Calendar" enabled will be synced</p>
                <p>• Changes in either calendar will be reflected in both</p>
                <p>• Reminders and event details are preserved</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Connect Google Calendar</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Sync your College Event Tracker events with Google Calendar for seamless integration.
                </p>
                <Button
                  onClick={handleConnectGoogleCalendar}
                  disabled={isConnectingGoogle}
                >
                  {isConnectingGoogle ? 'Connecting...' : 'Connect Google Calendar'}
                </Button>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>• Automatic bi-directional sync</p>
                <p>• Preserve event details and reminders</p>
                <p>• Choose which Google Calendar to sync with</p>
                <p>• Secure OAuth authentication</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Reminder Timing
          </CardTitle>
          <CardDescription>
            Configure when you want to be reminded about events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="oneWeek"
                checked={preferences.notifications.defaultReminders.oneWeek}
                onCheckedChange={(checked) =>
                  handlePreferenceChange('defaultReminders', {
                    ...preferences.notifications.defaultReminders,
                    oneWeek: checked
                  })
                }
              />
              <Label htmlFor="oneWeek">1 week before</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="threeDays"
                checked={preferences.notifications.defaultReminders.threeDays}
                onCheckedChange={(checked) =>
                  handlePreferenceChange('defaultReminders', {
                    ...preferences.notifications.defaultReminders,
                    threeDays: checked
                  })
                }
              />
              <Label htmlFor="threeDays">3 days before</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="oneDay"
                checked={preferences.notifications.defaultReminders.oneDay}
                onCheckedChange={(checked) =>
                  handlePreferenceChange('defaultReminders', {
                    ...preferences.notifications.defaultReminders,
                    oneDay: checked
                  })
                }
              />
              <Label htmlFor="oneDay">1 day before</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="twoHours"
                checked={preferences.notifications.defaultReminders.twoHours}
                onCheckedChange={(checked) =>
                  handlePreferenceChange('defaultReminders', {
                    ...preferences.notifications.defaultReminders,
                    twoHours: checked
                  })
                }
              />
              <Label htmlFor="twoHours">2 hours before</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>
            Prevent notifications during specified hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Quiet Hours</p>
              <p className="text-sm text-gray-600">
                Suppress notifications during sleep hours
              </p>
            </div>
            <Switch
              checked={preferences.notifications.quietHours.enabled}
              onCheckedChange={(enabled) =>
                handlePreferenceChange('quietHours', {
                  ...preferences.notifications.quietHours,
                  enabled
                })
              }
            />
          </div>

          {preferences.notifications.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Time</label>
                <Select
                  value={preferences.notifications.quietHours.start}
                  onValueChange={(start) =>
                    handlePreferenceChange('quietHours', {
                      ...preferences.notifications.quietHours,
                      start
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                        {`${i.toString().padStart(2, '0')}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">End Time</label>
                <Select
                  value={preferences.notifications.quietHours.end}
                  onValueChange={(end) =>
                    handlePreferenceChange('quietHours', {
                      ...preferences.notifications.quietHours,
                      end
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                        {`${i.toString().padStart(2, '0')}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card>
        <CardHeader>
          <CardTitle>Email Digest</CardTitle>
          <CardDescription>
            Receive weekly summaries of your events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Email Digest</p>
              <p className="text-sm text-gray-600">
                Get a summary of upcoming events and completed tasks
              </p>
            </div>
            <Select
              value={preferences.notifications.emailDigest}
              onValueChange={(emailDigest) =>
                handlePreferenceChange('emailDigest', emailDigest)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
