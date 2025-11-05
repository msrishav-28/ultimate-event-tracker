import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Filter } from 'lucide-react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sheet, SheetContent } from './ui/sheet';
import { Badge } from './ui/badge';
import { Event } from '../types';
import { useApp } from '../context/AppContext';

type ViewMode = 'month' | 'week' | 'day';
type CalendarEvent = Event & { day: number; time: string };

export function CalendarScreen() {
  const { events } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Get events for current month/week/day
  const getEventsForPeriod = (): CalendarEvent[] => {
    const periodEvents: CalendarEvent[] = [];

    events.forEach(event => {
      const eventDate = new Date(event.date);
      let includeEvent = false;

      switch (viewMode) {
        case 'month':
          includeEvent = eventDate.getMonth() === currentDate.getMonth() &&
                        eventDate.getFullYear() === currentDate.getFullYear();
          break;
        case 'week':
          const weekStart = new Date(currentDate);
          weekStart.setDate(currentDate.getDate() - currentDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          includeEvent = eventDate >= weekStart && eventDate <= weekEnd;
          break;
        case 'day':
          includeEvent = eventDate.toDateString() === currentDate.toDateString();
          break;
      }

      if (includeEvent) {
        periodEvents.push({
          ...event,
          day: eventDate.getDate(),
          time: event.time
        });
      }
    });

    return periodEvents.sort((a, b) => {
      if (viewMode === 'day') {
        return a.time.localeCompare(b.time);
      }
      return a.day - b.day || a.time.localeCompare(b.time);
    });
  };

  const calendarEvents = getEventsForPeriod();

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status color variation
  const getStatusColor = (status?: string) => {
    if (status === 'completed') return 'bg-blue-500';
    if (status === 'in_progress') return 'bg-purple-500';
    return '';
  };

  // Navigate calendar
  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }

    setCurrentDate(newDate);
  };

  // Get calendar header
  const getCalendarHeader = () => {
    switch (viewMode) {
      case 'month':
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      default:
        return '';
    }
  };

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

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateCalendar('prev')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <span className="text-lg font-medium min-w-[200px] text-center">
                    {getCalendarHeader()}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateCalendar('next')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Today
                  </Button>
                </div>
              </div>

              {/* View Mode Selector */}
              <div className="flex gap-2">
                <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calendar Content */}
            <div className="bg-white rounded-lg border shadow-sm">
              {viewMode === 'month' && <MonthView events={calendarEvents} onEventClick={setSelectedEvent} />}
              {viewMode === 'week' && <WeekView events={calendarEvents} currentDate={currentDate} onEventClick={setSelectedEvent} />}
              {viewMode === 'day' && <DayView events={calendarEvents} currentDate={currentDate} onEventClick={setSelectedEvent} />}
            </div>

            {/* Legend */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium text-gray-900 mb-3">Priority Legend</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm">Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-sm">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-sm">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm">Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <span>{new Date(selectedEvent.date).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{selectedEvent.time}</span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">📍</span>
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(selectedEvent.priority)}>
                    {selectedEvent.priority}
                  </Badge>
                  <Badge variant="outline">{selectedEvent.category}</Badge>
                </div>

                {selectedEvent.description && (
                  <div>
                    <p className="text-sm text-gray-600">{selectedEvent.description}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <Button className="flex-1">Edit Event</Button>
                <Button variant="outline" className="flex-1">View Details</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Month View Component
function MonthView({ events, onEventClick }: { events: CalendarEvent[], onEventClick: (event: Event) => void }) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days = [];
  const current = new Date(startDate);

  for (let i = 0; i < 42; i++) {
    const dayEvents = events.filter(event => event.day === current.getDate());
    days.push({
      date: new Date(current),
      day: current.getDate(),
      isCurrentMonth: current.getMonth() === today.getMonth(),
      isToday: current.toDateString() === today.toDateString(),
      events: dayEvents
    });
    current.setDate(current.getDate() + 1);
  }

  return (
    <div className="p-6">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div
            key={index}
            className={`min-h-[120px] p-2 border rounded-lg ${
              day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
            } ${day.isToday ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className={`text-sm font-medium mb-1 ${
              day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {day.day}
            </div>

            <div className="space-y-1">
              {day.events.slice(0, 3).map(event => (
                <div
                  key={event.id}
                  className={`text-xs p-1 rounded cursor-pointer truncate ${
                    event.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    `bg-opacity-20 text-${event.priority === 'critical' ? 'red' :
                      event.priority === 'high' ? 'orange' :
                      event.priority === 'medium' ? 'yellow' : 'green'}-800`
                  }`}
                  style={{
                    backgroundColor: event.status === 'completed' ? '#dbeafe' :
                      event.priority === 'critical' ? '#fef2f2' :
                      event.priority === 'high' ? '#fff7ed' :
                      event.priority === 'medium' ? '#fefce8' : '#f0fdf4'
                  }}
                  onClick={() => onEventClick(event)}
                >
                  {event.time} {event.title}
                </div>
              ))}

              {day.events.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{day.events.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ events, currentDate, onEventClick }: { events: CalendarEvent[], currentDate: Date, onEventClick: (event: Event) => void }) {
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dayEvents = events.filter(event => event.day === day.getDate());
    weekDays.push({ date: day, events: dayEvents });
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day, index) => (
          <div key={index} className="min-h-[400px]">
            <div className="text-center p-2 border-b">
              <div className="font-medium">{day.date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className={`text-lg ${day.date.toDateString() === new Date().toDateString() ? 'text-blue-600 font-bold' : ''}`}>
                {day.date.getDate()}
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {day.events.map(event => (
                <div
                  key={event.id}
                  className={`p-2 rounded text-sm cursor-pointer ${
                    event.status === 'completed' ? 'bg-blue-100 border-l-4 border-blue-500' :
                    `bg-${event.priority === 'critical' ? 'red' :
                      event.priority === 'high' ? 'orange' :
                      event.priority === 'medium' ? 'yellow' : 'green'}-100 border-l-4 border-${event.priority === 'critical' ? 'red' :
                      event.priority === 'high' ? 'orange' :
                      event.priority === 'medium' ? 'yellow' : 'green'}-500`
                  }`}
                  onClick={() => onEventClick(event)}
                >
                  <div className="font-medium">{event.time}</div>
                  <div className="truncate">{event.title}</div>
                  {event.location && <div className="text-xs text-gray-600 truncate">{event.location}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Day View Component
function DayView({ events, currentDate, onEventClick }: { events: CalendarEvent[], currentDate: Date, onEventClick: (event: Event) => void }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        <p className="text-gray-600">{events.length} events scheduled</p>
      </div>

      <div className="space-y-1">
        {hours.map(hour => {
          const hourEvents = events.filter(event => {
            const eventHour = parseInt(event.time.split(':')[0]);
            return eventHour === hour;
          });

          return (
            <div key={hour} className="flex border-b border-gray-200 min-h-[60px]">
              <div className="w-16 py-2 text-sm text-gray-500 border-r border-gray-200 text-center">
                {hour.toString().padStart(2, '0')}:00
              </div>

              <div className="flex-1 p-2">
                {hourEvents.map(event => (
                  <div
                    key={event.id}
                    className={`p-2 rounded mb-1 cursor-pointer ${
                      event.status === 'completed' ? 'bg-blue-100 border-l-4 border-blue-500' :
                      `bg-${event.priority === 'critical' ? 'red' :
                        event.priority === 'high' ? 'orange' :
                        event.priority === 'medium' ? 'yellow' : 'green'}-100 border-l-4 border-${event.priority === 'critical' ? 'red' :
                        event.priority === 'high' ? 'orange' :
                        event.priority === 'medium' ? 'yellow' : 'green'}-500`
                    }`}
                    onClick={() => onEventClick(event)}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-gray-600">{event.location}</div>
                    <div className="text-xs text-gray-500">{event.category} • {event.priority}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
