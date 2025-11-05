import { useState } from 'react';
import { List, Calendar as CalendarIcon, Clock, ChevronDown } from 'lucide-react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { EventCard } from './EventCard';
import { EventDetails } from './EventDetails';
import { AddEventModal } from './AddEventModal';
import { EventEditor } from './EventEditor';
import { MobileAddButton } from './MobileAddButton';
import { useApp } from '../context/AppContext';
import { Event } from '../types';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sheet, SheetContent } from './ui/sheet';
import { toast } from 'sonner@2.0.3';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

export function DashboardScreen() {
  const { events, addEvent, deleteEvent } = useApp();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'timeline'>('list');
  const [sortBy, setSortBy] = useState('relevance');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [filters, setFilters] = useState({
    categories: [] as string[],
    priorities: [] as string[],
  });

  // Filter events based on selected filters
  const filteredEvents = events.filter(event => {
    const categoryMatch = filters.categories.length === 0 || filters.categories.includes(event.category);
    const priorityMatch = filters.priorities.length === 0 || filters.priorities.includes(event.priority);
    return categoryMatch && priorityMatch;
  });

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (sortBy === 'priority') {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return 0; // relevance (default order)
  });

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleDeleteClick = (eventId: string) => {
    setEventToDelete(eventId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      deleteEvent(eventToDelete);
      if (selectedEvent?.id === eventToDelete) {
        setSelectedEvent(null);
      }
      toast.success('Event deleted successfully');
      setShowDeleteDialog(false);
      setEventToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setShowMobileSidebar(true)} />

      <div className="flex max-w-[1920px] mx-auto">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            onAddEvent={() => setShowAddModal(true)}
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar
              onAddEvent={() => {
                setShowAddModal(true);
                setShowMobileSidebar(false);
              }}
              filters={filters}
              onFilterChange={setFilters}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="p-4 md:p-6 space-y-4">
            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* View mode toggle */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="gap-2"
                >
                  <List className="w-4 h-4" />
                  List
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="gap-2"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Calendar
                </Button>
                <Button
                  variant={viewMode === 'timeline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                  className="gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Timeline
                </Button>
              </div>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-500">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results count */}
            <p className="text-[12px]" style={{ color: '#757575' }}>
              Showing {sortedEvents.length} events
            </p>

            {/* Event List */}
            <div className="grid grid-cols-1 gap-4">
              {sortedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[14px]" style={{ color: '#757575' }}>
                    No events found. Try adjusting your filters or add a new event.
                  </p>
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4"
                    style={{ backgroundColor: '#1976D2' }}
                  >
                    Add Your First Event
                  </Button>
                </div>
              ) : (
                sortedEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => handleEventClick(event)}
                    isSelected={selectedEvent?.id === event.id}
                  />
                ))
              )}
            </div>

            {/* Mobile: Floating Add Button */}
            <MobileAddButton onClick={() => setShowAddModal(true)} />
          </div>
        </div>

        {/* Desktop Event Details Panel */}
        {selectedEvent && (
          <div className="hidden lg:block">
            <EventDetails
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              onEdit={() => {
                setEditingEvent(selectedEvent);
                setShowEventEditor(true);
              }}
              onDelete={() => handleDeleteClick(selectedEvent.id)}
            />
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <AddEventModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Event Editor */}
      <EventEditor
        open={showEventEditor}
        onClose={() => {
          setShowEventEditor(false);
          setEditingEvent(null);
        }}
        event={editingEvent}
        onSave={(updatedEvent) => {
          // Close the editor
          setShowEventEditor(false);
          setEditingEvent(null);
          // The context will automatically update the events list
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer - visible in main content */}
      <div className="border-t bg-white px-6 py-4 text-center">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-[12px]" style={{ color: '#757575' }}>
          <div className="flex gap-4">
            <span>Powered by College Event Tracker</span>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Feedback</a>
          </div>
          <div>Last synced 2 min ago</div>
        </div>
      </div>
    </div>
  );
}
