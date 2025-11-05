import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Clock, Link, Calendar, MapPin, User, Tag, Save, Edit3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Event, Priority, Category } from '../types';
import { useApp } from '../context/AppContext';
import { toast } from 'sonner@2.0.3';

interface EventEditorProps {
  open: boolean;
  onClose: () => void;
  event?: Event | null; // null for new event, Event for editing
  onSave?: (event: Event) => void;
}

interface PrepTask {
  task: string;
  completed: boolean;
  dueDate?: string;
  id: string;
}

export function EventEditor({ open, onClose, event, onSave }: EventEditorProps) {
  const { events: allEvents, addEvent, updateEvent, updateEventStatus } = useApp();
  const isEditing = !!event;

  const [eventData, setEventData] = useState<Partial<Event>>({
    title: '',
    date: '',
    time: '',
    location: '',
    category: 'workshop',
    priority: 'medium',
    description: '',
    prepProgress: 0,
    status: 'scheduled',
    preparationNotes: '',
    preparationTasks: [],
    reminders: {
      oneWeek: true,
      threeDays: true,
      oneDay: true,
      twoHours: true,
    },
    addToCalendar: true,
    postToFriends: false,
    relatedEvents: [],
    isPrep: false,
    prepFor: undefined,
  });

  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedRelatedEvents, setSelectedRelatedEvents] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  // Load event data when editing
  useEffect(() => {
    if (isEditing && event) {
      setEventData({
        ...event,
        preparationTasks: event.preparationTasks || [],
      });
      setPrepTasks((event.preparationTasks || []).map(task => ({
        ...task,
        id: Math.random().toString(36).substr(2, 9)
      })));
      setSelectedRelatedEvents(event.relatedEvents || []);
    } else {
      // Reset for new event
      setEventData({
        title: '',
        date: '',
        time: '',
        location: '',
        category: 'workshop',
        priority: 'medium',
        description: '',
        prepProgress: 0,
        status: 'scheduled',
        preparationNotes: '',
        preparationTasks: [],
        reminders: {
          oneWeek: true,
          threeDays: true,
          oneDay: true,
          twoHours: true,
        },
        addToCalendar: true,
        postToFriends: false,
        relatedEvents: [],
        isPrep: false,
        prepFor: undefined,
      });
      setPrepTasks([]);
      setSelectedRelatedEvents([]);
      setNewTask('');
    }
  }, [event, isEditing]);

  const handleSave = async () => {
    if (!eventData.title || !eventData.date || !eventData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Update prep tasks and calculate progress
      const updatedPrepTasks = prepTasks.map(task => ({
        task: task.task,
        completed: task.completed,
        dueDate: task.dueDate
      }));

      const completedTasks = prepTasks.filter(task => task.completed).length;
      const totalTasks = prepTasks.length;
      const prepProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const finalEventData = {
        ...eventData,
        preparationTasks: updatedPrepTasks,
        prepProgress,
        relatedEvents: selectedRelatedEvents,
      };

      if (isEditing) {
        await updateEvent(event!.id, finalEventData);
        toast.success('Event updated successfully!');
      } else {
        await addEvent(finalEventData);
        toast.success('Event created successfully!');
      }

      onSave?.(finalEventData as Event);
      onClose();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update event' : 'Failed to create event');
    }
  };

  const addPrepTask = () => {
    if (!newTask.trim()) return;

    const task: PrepTask = {
      task: newTask.trim(),
      completed: false,
      id: Math.random().toString(36).substr(2, 9)
    };

    setPrepTasks([...prepTasks, task]);
    setNewTask('');
  };

  const removePrepTask = (id: string) => {
    setPrepTasks(prepTasks.filter(task => task.id !== id));
  };

  const togglePrepTask = (id: string) => {
    setPrepTasks(prepTasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const updatePrepTask = (id: string, updates: Partial<PrepTask>) => {
    setPrepTasks(prepTasks.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  const getAvailableRelatedEvents = () => {
    return allEvents.filter(e =>
      e.id !== event?.id && // Don't show self
      !selectedRelatedEvents.includes(e.id) // Don't show already selected
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="preparation">Preparation</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={eventData.title}
                  onChange={(e) => setEventData({...eventData, title: e.target.value})}
                  placeholder="Enter event title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={eventData.category} onValueChange={(value) => setEventData({...eventData, category: value as Category})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="competition">Competition</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventData.date}
                  onChange={(e) => setEventData({...eventData, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={eventData.time}
                  onChange={(e) => setEventData({...eventData, time: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={eventData.location}
                  onChange={(e) => setEventData({...eventData, location: e.target.value})}
                  placeholder="Enter location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={eventData.priority} onValueChange={(value) => setEventData({...eventData, priority: value as Priority})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={eventData.status} onValueChange={(value) => setEventData({...eventData, status: value as Event['status']})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="organizer">Organizer</Label>
                <Input
                  id="organizer"
                  value={eventData.organizerName}
                  onChange={(e) => setEventData({...eventData, organizerName: e.target.value})}
                  placeholder="Event organizer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventData.description}
                onChange={(e) => setEventData({...eventData, description: e.target.value})}
                placeholder="Event description"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="calendar"
                  checked={eventData.addToCalendar}
                  onCheckedChange={(checked) => setEventData({...eventData, addToCalendar: checked})}
                />
                <Label htmlFor="calendar">Add to Google Calendar</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="friends"
                  checked={eventData.postToFriends}
                  onCheckedChange={(checked) => setEventData({...eventData, postToFriends: checked})}
                />
                <Label htmlFor="friends">Share with friends</Label>
              </div>
            </div>
          </TabsContent>

          {/* Preparation Tab */}
          <TabsContent value="preparation" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prepNotes">Preparation Notes</Label>
              <Textarea
                id="prepNotes"
                value={eventData.preparationNotes}
                onChange={(e) => setEventData({...eventData, preparationNotes: e.target.value})}
                placeholder="General preparation notes and instructions"
                rows={3}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Preparation Tasks
                  <span className="text-sm font-normal">
                    {prepTasks.filter(t => t.completed).length}/{prepTasks.length} completed
                  </span>
                </CardTitle>
                <CardDescription>
                  Break down your preparation into manageable tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new task */}
                <div className="flex gap-2">
                  <Input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a preparation task..."
                    onKeyPress={(e) => e.key === 'Enter' && addPrepTask()}
                  />
                  <Button onClick={addPrepTask} disabled={!newTask.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Task list */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {prepTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 p-2 border rounded">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => togglePrepTask(task.id)}
                      />
                      <Input
                        value={task.task}
                        onChange={(e) => updatePrepTask(task.id, { task: e.target.value })}
                        className={`flex-1 ${task.completed ? 'line-through text-gray-500' : ''}`}
                      />
                      <Input
                        type="date"
                        value={task.dueDate || ''}
                        onChange={(e) => updatePrepTask(task.id, { dueDate: e.target.value })}
                        className="w-32"
                        placeholder="Due date"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePrepTask(task.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {prepTasks.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No preparation tasks yet. Add some tasks to track your progress!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relationships Tab */}
          <TabsContent value="relationships" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPrep"
                  checked={eventData.isPrep}
                  onCheckedChange={(checked) => setEventData({...eventData, isPrep: checked})}
                />
                <Label htmlFor="isPrep">This is a preparation event</Label>
              </div>

              {eventData.isPrep && (
                <div className="space-y-2">
                  <Label>Preparation for Event</Label>
                  <Select
                    value={eventData.prepFor}
                    onValueChange={(value) => setEventData({...eventData, prepFor: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select main event" />
                    </SelectTrigger>
                    <SelectContent>
                      {allEvents
                        .filter(e => !e.isPrep && e.id !== event?.id)
                        .map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.title} ({new Date(e.date).toLocaleDateString()})
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Related Events</CardTitle>
                <CardDescription>
                  Link this event to related events, series, or prerequisites
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected related events */}
                <div className="space-y-2">
                  <Label>Currently Related Events:</Label>
                  {selectedRelatedEvents.length === 0 ? (
                    <p className="text-gray-500 text-sm">No related events selected</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedRelatedEvents.map(eventId => {
                        const relatedEvent = allEvents.find(e => e.id === eventId);
                        return relatedEvent ? (
                          <Badge key={eventId} variant="secondary" className="flex items-center gap-1">
                            {relatedEvent.title}
                            <X
                              className="w-3 h-3 cursor-pointer"
                              onClick={() => setSelectedRelatedEvents(prev => prev.filter(id => id !== eventId))}
                            />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Available events to relate */}
                <div className="space-y-2">
                  <Label>Add Related Events:</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {getAvailableRelatedEvents().map(availableEvent => (
                      <div
                        key={availableEvent.id}
                        className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedRelatedEvents(prev => [...prev, availableEvent.id])}
                      >
                        <div>
                          <div className="font-medium">{availableEvent.title}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(availableEvent.date).toLocaleDateString()} • {availableEvent.category}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Reminder Schedule
                </CardTitle>
                <CardDescription>
                  Choose when you want to be reminded about this event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="oneWeek"
                      checked={eventData.reminders?.oneWeek}
                      onCheckedChange={(checked) =>
                        setEventData({
                          ...eventData,
                          reminders: { ...eventData.reminders!, oneWeek: checked }
                        })
                      }
                    />
                    <Label htmlFor="oneWeek">1 week before</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="threeDays"
                      checked={eventData.reminders?.threeDays}
                      onCheckedChange={(checked) =>
                        setEventData({
                          ...eventData,
                          reminders: { ...eventData.reminders!, threeDays: checked }
                        })
                      }
                    />
                    <Label htmlFor="threeDays">3 days before</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="oneDay"
                      checked={eventData.reminders?.oneDay}
                      onCheckedChange={(checked) =>
                        setEventData({
                          ...eventData,
                          reminders: { ...eventData.reminders!, oneDay: checked }
                        })
                      }
                    />
                    <Label htmlFor="oneDay">1 day before</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="twoHours"
                      checked={eventData.reminders?.twoHours}
                      onCheckedChange={(checked) =>
                        setEventData({
                          ...eventData,
                          reminders: { ...eventData.reminders!, twoHours: checked }
                        })
                      }
                    />
                    <Label htmlFor="twoHours">2 hours before</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Reminder Message</CardTitle>
                <CardDescription>
                  Add a personal note to your reminders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., Remember to bring your laptop and practice problems"
                  value={eventData.customNote || ''}
                  onChange={(e) => setEventData({...eventData, customNote: e.target.value})}
                  rows={2}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Update Event' : 'Create Event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
