import { MapPin, Clock, Calendar, ChevronRight } from 'lucide-react';
import { Event } from '../types';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface EventCardProps {
  event: Event;
  onClick: () => void;
  isSelected?: boolean;
}

export function EventCard({ event, onClick, isSelected }: EventCardProps) {
  const priorityColors = {
    critical: '#E53935',
    high: '#FB8C00',
    medium: '#FDD835',
    low: '#43A047',
  };

  const categoryLabels = {
    academic: 'Academic',
    competition: 'Competition',
    webinar: 'Webinar',
    workshop: 'Workshop',
    meeting: 'Meeting',
    social: 'Social',
  };

  const formatDate = (date: string) => {
    const eventDate = new Date(date);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    
    return eventDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg border bg-white cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] group",
        isSelected && "ring-2 ring-blue-500 shadow-md"
      )}
    >
      <div className="space-y-3">
        {/* Title and priority */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: priorityColors[event.priority] }}
              />
              <h3 className="text-[14px] truncate" style={{ color: '#212121' }}>
                {event.title}
              </h3>
            </div>
            <Badge 
              variant="secondary" 
              className="text-[12px] h-5"
            >
              {categoryLabels[event.category]}
            </Badge>
          </div>
          <ChevronRight className="w-5 h-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#757575' }} />
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-[12px]" style={{ color: '#757575' }}>
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>

        {/* Date and time */}
        <div className="flex items-center gap-4 text-[12px]" style={{ color: '#757575' }}>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{event.time}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[12px]" style={{ color: '#757575' }}>
            <span>Preparation Progress</span>
            <span>{event.prepProgress}%</span>
          </div>
          <Progress value={event.prepProgress} className="h-2" />
        </div>

        {/* Action buttons - shown on hover */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 h-8 text-[12px]"
            onClick={(e) => {
              e.stopPropagation();
              // Add to calendar action
            }}
          >
            Quick Add to Calendar
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 text-[12px]"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Details
          </Button>
        </div>
      </div>
    </div>
  );
}
