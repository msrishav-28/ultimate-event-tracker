import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { TopBar } from './TopBar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useApp } from '../context/AppContext';
import { toast } from 'sonner@2.0.3';

export function SettingsScreen() {
  const { setCurrentScreen, user, preferences, updatePreferences, logout } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDisconnectCalendar = () => {
    updatePreferences({
      googleCalendar: { connected: false },
    });
    toast.success('Google Calendar disconnected');
  };

  const handleExportData = (format: 'json' | 'csv' | 'ics') => {
    toast.success(`Exporting data as ${format.toUpperCase()}...`);
    // Mock export functionality
  };

  const handleDeleteAccount = () => {
    toast.error('Account deletion is permanent');
    setShowDeleteConfirm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setCurrentScreen('dashboard')} />

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentScreen('dashboard')}
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-[20px]" style={{ color: '#212121' }}>Settings & Preferences</h1>
        </div>

        <div className="bg-white rounded-lg border divide-y">
          {/* Notification Preferences */}
          <div className="p-6 space-y-6">
            <h2 className="text-[14px]" style={{ color: '#212121' }}>NOTIFICATION PREFERENCES</h2>

            <div className="space-y-4">
              <div>
                <Label className="text-[14px] mb-3 block">Default Reminder Times</Label>
                <div className="space-y-3 pl-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="def-oneWeek" className="cursor-pointer">1 Week Before</Label>
                    <Switch
                      id="def-oneWeek"
                      checked={preferences.notifications.defaultReminders.oneWeek}
                      onCheckedChange={(checked) =>
                        updatePreferences({
                          notifications: {
                            ...preferences.notifications,
                            defaultReminders: {
                              ...preferences.notifications.defaultReminders,
                              oneWeek: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="def-threeDays" className="cursor-pointer">3 Days Before</Label>
                    <Switch
                      id="def-threeDays"
                      checked={preferences.notifications.defaultReminders.threeDays}
                      onCheckedChange={(checked) =>
                        updatePreferences({
                          notifications: {
                            ...preferences.notifications,
                            defaultReminders: {
                              ...preferences.notifications.defaultReminders,
                              threeDays: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="def-oneDay" className="cursor-pointer">1 Day Before</Label>
                    <Switch
                      id="def-oneDay"
                      checked={preferences.notifications.defaultReminders.oneDay}
                      onCheckedChange={(checked) =>
                        updatePreferences({
                          notifications: {
                            ...preferences.notifications,
                            defaultReminders: {
                              ...preferences.notifications.defaultReminders,
                              oneDay: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="def-twoHours" className="cursor-pointer">2 Hours Before</Label>
                    <Switch
                      id="def-twoHours"
                      checked={preferences.notifications.defaultReminders.twoHours}
                      onCheckedChange={(checked) =>
                        updatePreferences({
                          notifications: {
                            ...preferences.notifications,
                            defaultReminders: {
                              ...preferences.notifications.defaultReminders,
                              twoHours: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label htmlFor="quietHours" className="cursor-pointer">Quiet Hours</Label>
                  <Switch
                    id="quietHours"
                    checked={preferences.notifications.quietHours.enabled}
                    onCheckedChange={(checked) =>
                      updatePreferences({
                        notifications: {
                          ...preferences.notifications,
                          quietHours: {
                            ...preferences.notifications.quietHours,
                            enabled: checked,
                          },
                        },
                      })
                    }
                  />
                </div>
                {preferences.notifications.quietHours.enabled && (
                  <div className="flex gap-2 pl-4">
                    <Input
                      type="time"
                      value={preferences.notifications.quietHours.start}
                      onChange={(e) =>
                        updatePreferences({
                          notifications: {
                            ...preferences.notifications,
                            quietHours: {
                              ...preferences.notifications.quietHours,
                              start: e.target.value,
                            },
                          },
                        })
                      }
                      className="flex-1"
                    />
                    <span className="text-[14px] self-center" style={{ color: '#757575' }}>to</span>
                    <Input
                      type="time"
                      value={preferences.notifications.quietHours.end}
                      onChange={(e) =>
                        updatePreferences({
                          notifications: {
                            ...preferences.notifications,
                            quietHours: {
                              ...preferences.notifications.quietHours,
                              end: e.target.value,
                            },
                          },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailDigest">Email Digest Frequency</Label>
                <Select
                  value={preferences.notifications.emailDigest}
                  onValueChange={(value: any) =>
                    updatePreferences({
                      notifications: {
                        ...preferences.notifications,
                        emailDigest: value,
                      },
                    })
                  }
                >
                  <SelectTrigger id="emailDigest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="muteKeywords">Mute Keywords (comma-separated)</Label>
                <Input
                  id="muteKeywords"
                  placeholder="hackathon, social, meetup"
                  className="text-[14px]"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Organization Preferences */}
          <div className="p-6 space-y-6">
            <h2 className="text-[14px]" style={{ color: '#212121' }}>ORGANIZATION</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultSort">Default Sort</Label>
                <Select
                  value={preferences.defaultSort}
                  onValueChange={(value) => updatePreferences({ defaultSort: value })}
                >
                  <SelectTrigger id="defaultSort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">By Relevance</SelectItem>
                    <SelectItem value="date">By Date</SelectItem>
                    <SelectItem value="priority">By Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultView">Default View</Label>
                <Select
                  value={preferences.defaultView}
                  onValueChange={(value: any) => updatePreferences({ defaultView: value })}
                >
                  <SelectTrigger id="defaultView">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">List</SelectItem>
                    <SelectItem value="calendar">Calendar</SelectItem>
                    <SelectItem value="timeline">Timeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="hidePast" className="cursor-pointer">Hide Past Events</Label>
                <Switch
                  id="hidePast"
                  checked={preferences.hidePastEvents}
                  onCheckedChange={(checked) => updatePreferences({ hidePastEvents: checked })}
                />
              </div>

              <div>
                <Label className="mb-3 block">Interested Categories</Label>
                <div className="grid grid-cols-2 gap-3 pl-4">
                  {['Academic', 'Competition', 'Webinar', 'Workshop', 'Meeting', 'Social'].map(category => (
                    <div key={category} className="flex items-center gap-2">
                      <Checkbox id={`cat-${category}`} defaultChecked />
                      <Label htmlFor={`cat-${category}`} className="cursor-pointer text-[14px]">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Theme</Label>
                <RadioGroup
                  value={preferences.theme}
                  onValueChange={(value: any) => updatePreferences({ theme: value })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="cursor-pointer">Light</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="cursor-pointer">Dark</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="auto" />
                    <Label htmlFor="auto" className="cursor-pointer">Auto</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          <Separator />

          {/* Calendar & Sync */}
          <div className="p-6 space-y-6">
            <h2 className="text-[14px]" style={{ color: '#212121' }}>CALENDAR & SYNC</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-[14px]" style={{ color: '#212121' }}>Google Calendar</p>
                  {preferences.googleCalendar.connected ? (
                    <p className="text-[12px]" style={{ color: '#43A047' }}>
                      ✓ Connected ({preferences.googleCalendar.email})
                    </p>
                  ) : (
                    <p className="text-[12px]" style={{ color: '#757575' }}>
                      Not connected
                    </p>
                  )}
                </div>
                {preferences.googleCalendar.connected ? (
                  <Button variant="outline" size="sm" onClick={handleDisconnectCalendar}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" style={{ backgroundColor: '#1976D2' }}>
                    Connect
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoExport" className="cursor-pointer">Auto-export Events</Label>
                <Switch id="autoExport" defaultChecked />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calFormat">Calendar Export Format</Label>
                <Select defaultValue="ics">
                  <SelectTrigger id="calFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ics">.ics (iCalendar)</SelectItem>
                    <SelectItem value="csv">.csv</SelectItem>
                    <SelectItem value="json">.json</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account */}
          <div className="p-6 space-y-6">
            <h2 className="text-[14px]" style={{ color: '#212121' }}>ACCOUNT</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue={user?.name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Select defaultValue={user?.year}>
                    <SelectTrigger id="year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Freshman">Freshman</SelectItem>
                      <SelectItem value="Sophomore">Sophomore</SelectItem>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Graduate">Graduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select defaultValue={user?.department}>
                    <SelectTrigger id="department">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Arts">Arts</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  onClick={logout}
                  className="flex-1"
                >
                  Log Out
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Data & Privacy */}
          <div className="p-6 space-y-6">
            <h2 className="text-[14px]" style={{ color: '#212121' }}>DATA & PRIVACY</h2>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => handleExportData('json')}
                >
                  <Download className="w-4 h-4" />
                  Export as JSON
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => handleExportData('csv')}
                >
                  <Download className="w-4 h-4" />
                  Export as CSV
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => handleExportData('ics')}
                >
                  <Download className="w-4 h-4" />
                  Export as ICS
                </Button>
              </div>

              <div className="text-[12px] space-y-1">
                <a href="#" className="text-blue-600 hover:underline block">
                  Privacy Policy
                </a>
                <a href="#" className="text-blue-600 hover:underline block">
                  Terms of Service
                </a>
              </div>

              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleDeleteAccount}
              >
                <Trash2 className="w-4 h-4" />
                Delete Account Permanently
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
