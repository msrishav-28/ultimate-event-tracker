import React, { useState } from 'react';
import { Event } from '../types';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { ShareEventModal } from './ShareEventModal';
import { Star, X, Calendar, Clock, MapPin, Tag, Bell, Edit, Share2, Trash2, CheckCircle, Circle, Link, User } from 'lucide-react';

interface EventDetailsProps {
  event: Event;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function EventDetails({ event, onClose, onEdit, onDelete }: EventDetailsProps) {
  const priorityStars = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  const categoryLabels = {
    academic: 'Academic',
    competition: 'Competition',
    webinar: 'Webinar',
    workshop: 'Workshop',
    meeting: 'Meeting',
    social: 'Social',
  };

  const formatDateTime = (date: string, time: string) => {
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    }) + ' at ' + time;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: `${event.title} - ${formatDateTime(event.date, event.time)}`,
        url: window.location.href,
      });
    } else {
      // Fallback to our custom share modal
      setShowShareModal(true);
    }
  };

  const [showShareModal, setShowShareModal] = React.useState(false);

  return (
    <div className="w-80 border-l bg-white h-[calc(100vh-60px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-[14px]" style={{ color: '#212121' }}>Event Details</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" style={{ color: '#757575' }} />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            <h3 className="text-[20px] mb-2" style={{ color: '#212121' }}>{event.title}</h3>
            <Badge variant="secondary" className="text-[12px]">
              {categoryLabels[event.category]}
            </Badge>
          </div>

          {/* Priority stars */}
          <div className="space-y-2">
            <p className="text-[12px]" style={{ color: '#757575' }}>Priority</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="w-5 h-5"
                  fill={star <= priorityStars[event.priority] ? '#FB8C00' : 'none'}
                  style={{ 
                    color: star <= priorityStars[event.priority] ? '#FB8C00' : '#E0E0E0'
                  }}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="text-[14px]" style={{ color: '#212121' }}>Basic Information</h4>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#757575' }} />
                <div className="text-[12px]" style={{ color: '#424242' }}>
                  {formatDateTime(event.date, event.time)}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#757575' }} />
                <div className="text-[12px]" style={{ color: '#424242' }}>
                  Duration: 2 hours (estimated)
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#757575' }} />
                <div className="text-[12px]" style={{ color: '#424242' }}>
                  {event.location}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#757575' }} />
                <div className="text-[12px]" style={{ color: '#424242' }}>
                  Category: {categoryLabels[event.category]}
                </div>
              </div>

              {event.source && (
                <div className="text-[12px]" style={{ color: '#757575' }}>
                  Source: {event.source}
                  {event.confidence && ` (${event.confidence}% confidence)`}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-[14px]" style={{ color: '#212121' }}>Description</h4>
            <p className="text-[12px]" style={{ color: '#424242' }}>
              {event.description}
            </p>
          </div>

          <Separator />

          {/* Status */}
          {event.status && event.status !== 'scheduled' && (
            <div className="space-y-2">
              <h4 className="text-[14px]" style={{ color: '#212121' }}>Status</h4>
              <Badge variant={event.status === 'completed' ? 'default' : event.status === 'in_progress' ? 'secondary' : 'outline'}>
                {event.status === 'in_progress' ? 'In Progress' : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
            </div>
          )}

          <Separator />

          {/* Preparation Notes */}
          {event.preparationNotes && (
            <>
              <div className="space-y-2">
                <h4 className="text-[14px]" style={{ color: '#212121' }}>Preparation Notes</h4>
                <p className="text-[12px]" style={{ color: '#424242' }}>
                  {event.preparationNotes}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Preparation Progress */}
          {event.preparationTasks && event.preparationTasks.length > 0 && (
            <>
              <div className="space-y-2">
                <h4 className="text-[14px]" style={{ color: '#212121' }}>Preparation Progress</h4>
                <div className="space-y-1">
                  <Progress value={Math.round((event.preparationTasks.filter(t => t.completed).length / event.preparationTasks.length) * 100)} className="h-2" />
                  <p className="text-[12px]" style={{ color: '#757575' }}>
                    You're {Math.round((event.preparationTasks.filter(t => t.completed).length / event.preparationTasks.length) * 100)}% prepared for this event
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Preparation Tasks */}
          {event.preparationTasks && event.preparationTasks.length > 0 && (
            <>
              <div className="space-y-2">
                <h4 className="text-[14px]" style={{ color: '#212121' }}>Preparation Tasks</h4>
                <div className="space-y-2">
                  {event.preparationTasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {task.completed ? (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className={`text-[12px] ${task.completed ? 'line-through text-gray-500' : ''}`} style={{ color: '#424242' }}>
                        {task.task}
                        {task.dueDate && (
                          <span className="text-gray-500 ml-1">
                            (Due: {new Date(task.dueDate).toLocaleDateString()})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[12px]" style={{ color: '#757575' }}>
                  {event.preparationTasks.filter(t => t.completed).length} of {event.preparationTasks.length} tasks completed
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Related Events */}
          {event.relatedEvents && event.relatedEvents.length > 0 && (
            <>
              <div className="space-y-2">
                <h4 className="text-[14px]" style={{ color: '#212121' }}>Related Events</h4>
                <div className="space-y-1">
                  {event.relatedEvents.map((relatedId, index) => (
                    <div key={index} className="flex items-center gap-2 text-[12px]" style={{ color: '#424242' }}>
                      <Link className="w-3 h-3" />
                      <span>Related event #{relatedId}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Organizer */}
          {event.organizerName && (
            <>
              <div className="space-y-2">
                <h4 className="text-[14px]" style={{ color: '#212121' }}>Organizer</h4>
                <div className="flex items-center gap-2 text-[12px]" style={{ color: '#424242' }}>
                  <User className="w-4 h-4" />
                  {event.organizerName}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Custom Note */}
          {event.customNote && (
            <>
              <div className="space-y-2">
                <h4 className="text-[14px]" style={{ color: '#212121' }}>Custom Reminder Note</h4>
                <p className="text-[12px]" style={{ color: '#424242' }}>
                  {event.customNote}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Reminders */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: '#757575' }} />
              <h4 className="text-[14px]" style={{ color: '#212121' }}>Reminders</h4>
            </div>
            <div className="space-y-1 text-[12px]" style={{ color: '#424242' }}>
              {event.reminders.oneWeek && <div>✓ 1 week before</div>}
              {event.reminders.threeDays && <div>✓ 3 days before</div>}
              {event.reminders.oneDay && <div>✓ 1 day before</div>}
              {event.reminders.twoHours && <div>✓ 2 hours before</div>}
            </div>
          </div>

          {event.addToCalendar && (
            <>
              <Separator />
              <div className="text-[12px]" style={{ color: '#424242' }}>
                ✓ Added to Google Calendar
              </div>
            </>
          )}

          {event.postToFriends && (
            <>
              <Separator />
              <div className="text-[12px]" style={{ color: '#424242' }}>
                ✓ Shared with friends
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Action buttons */}
      <div className="p-4 border-t space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 h-9"
            onClick={onEdit}
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="gap-2 h-9"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="destructive"
          className="w-full gap-2 h-9"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
          Delete Event
        </Button>
      </div>
    </div>

    {/* Share Modal */}
    <ShareEventModal
      open={showShareModal}
      onClose={() => setShowShareModal(false)}
      event={event}
    />
  );
}
