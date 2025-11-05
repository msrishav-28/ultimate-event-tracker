import { Calendar, Users, Trophy, Plus, Filter, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { useState } from 'react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  onAddEvent: () => void;
  filters: {
    categories: string[];
    priorities: string[];
  };
  onFilterChange: (filters: any) => void;
}

export function Sidebar({ onAddEvent, filters, onFilterChange }: SidebarProps) {
  const { events, setCurrentScreen } = useApp();
  const [dateRange, setDateRange] = useState([0, 30]);

  const categoryCounts = {
    all: events.length,
    competition: events.filter(e => e.category === 'competition').length,
    webinar: events.filter(e => e.category === 'webinar').length,
    workshop: events.filter(e => e.category === 'workshop').length,
    meeting: events.filter(e => e.category === 'meeting').length,
    social: events.filter(e => e.category === 'social').length,
  };

  const priorityCounts = {
    critical: events.filter(e => e.priority === 'critical').length,
    high: events.filter(e => e.priority === 'high').length,
    medium: events.filter(e => e.priority === 'medium').length,
    low: events.filter(e => e.priority === 'low').length,
  };

  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const handlePriorityToggle = (priority: string) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onFilterChange({ ...filters, priorities: newPriorities });
  };

  return (
    <div className="w-64 border-r bg-white h-[calc(100vh-60px)] overflow-y-auto p-4 space-y-6">
      {/* Filters Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4" style={{ color: '#757575' }} />
          <h3 className="text-[14px]" style={{ color: '#212121' }}>FILTERS</h3>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="all"
              checked={filters.categories.length === 0}
              onCheckedChange={() => onFilterChange({ ...filters, categories: [] })}
            />
            <Label htmlFor="all" className="text-[14px] cursor-pointer flex-1" style={{ color: '#424242' }}>
              All Events
              <span className="ml-1" style={{ color: '#757575' }}>({categoryCounts.all})</span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="competition"
              checked={filters.categories.includes('competition')}
              onCheckedChange={() => handleCategoryToggle('competition')}
            />
            <Label htmlFor="competition" className="text-[14px] cursor-pointer flex-1" style={{ color: '#424242' }}>
              Competitions
              <span className="ml-1" style={{ color: '#757575' }}>({categoryCounts.competition})</span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="webinar"
              checked={filters.categories.includes('webinar')}
              onCheckedChange={() => handleCategoryToggle('webinar')}
            />
            <Label htmlFor="webinar" className="text-[14px] cursor-pointer flex-1" style={{ color: '#424242' }}>
              Webinars
              <span className="ml-1" style={{ color: '#757575' }}>({categoryCounts.webinar})</span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="workshop"
              checked={filters.categories.includes('workshop')}
              onCheckedChange={() => handleCategoryToggle('workshop')}
            />
            <Label htmlFor="workshop" className="text-[14px] cursor-pointer flex-1" style={{ color: '#424242' }}>
              Workshops
              <span className="ml-1" style={{ color: '#757575' }}>({categoryCounts.workshop})</span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="meeting"
              checked={filters.categories.includes('meeting')}
              onCheckedChange={() => handleCategoryToggle('meeting')}
            />
            <Label htmlFor="meeting" className="text-[14px] cursor-pointer flex-1" style={{ color: '#424242' }}>
              Meetings
              <span className="ml-1" style={{ color: '#757575' }}>({categoryCounts.meeting})</span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="social"
              checked={filters.categories.includes('social')}
              onCheckedChange={() => handleCategoryToggle('social')}
            />
            <Label htmlFor="social" className="text-[14px] cursor-pointer flex-1" style={{ color: '#424242' }}>
              Social
              <span className="ml-1" style={{ color: '#757575' }}>({categoryCounts.social})</span>
            </Label>
          </div>
        </div>
      </div>

      {/* Priority Section */}
      <div className="space-y-3">
        <h3 className="text-[14px]" style={{ color: '#212121' }}>BY PRIORITY</h3>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="critical"
              checked={filters.priorities.includes('critical')}
              onCheckedChange={() => handlePriorityToggle('critical')}
            />
            <Label htmlFor="critical" className="text-[14px] cursor-pointer flex-1" style={{ color: '#424242' }}>
              Critical
              <span className="ml-1" style={{ color: '#757575' }}>({priorityCounts.critical})</span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="high"
              checked={filters.priorities.includes('high')}
              onCheckedChange={() => handlePriorityToggle('high')}
            />
            <Label htmlFor="high" className="text-[14px] cursor-pointer flex-1" style={{ color: '#424242' }}>
              High
              <span className="ml-1" style={{ color: '#757575' }}>({priorityCounts.high})</span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="medium"
              checked={filters.priorities.includes('medium')}
              onCheckedChange={() => handlePriorityToggle('medium')}
            />
            <Label htmlFor="medium" className="text-[14px] cursor-pointer flex-1" style={{ color: '#424242' }}>
              Medium
              <span className="ml-1" style={{ color: '#757575' }}>({priorityCounts.medium})</span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="low"
              checked={filters.priorities.includes('low')}
              onCheckedChange={() => handlePriorityToggle('low')}
            />
            <Label htmlFor="low" className="text-[14px] cursor-pointer flex-1" style={{ color: '#424242' }}>
              Low
              <span className="ml-1" style={{ color: '#757575' }}>({priorityCounts.low})</span>
            </Label>
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-3">
        <h3 className="text-[14px]" style={{ color: '#212121' }}>BY DATE</h3>
        <div className="space-y-2">
          <Slider
            value={dateRange}
            onValueChange={setDateRange}
            min={0}
            max={365}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[12px]" style={{ color: '#757575' }}>
            <span>Past</span>
            <span>Next {dateRange[1]} days</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-[14px]" style={{ color: '#212121' }}>QUICK ACTIONS</h3>
        
        <Button 
          onClick={onAddEvent}
          className="w-full justify-start gap-2 h-10"
          style={{ backgroundColor: '#1976D2' }}
        >
          <Plus className="w-4 h-4" />
          Add Event
        </Button>

        <Button 
          variant="outline"
          onClick={() => setCurrentScreen('calendar')}
          className="w-full justify-start gap-2 h-10"
        >
          <Calendar className="w-4 h-4" />
          View Calendar
        </Button>

        <Button 
          variant="outline"
          onClick={() => setCurrentScreen('friends')}
          className="w-full justify-start gap-2 h-10"
        >
          <Users className="w-4 h-4" />
          Friends Events
        </Button>

        <Button 
          variant="outline"
          onClick={() => setCurrentScreen('friends')}
          className="w-full justify-start gap-2 h-10"
        >
          <Trophy className="w-4 h-4" />
          Leaderboard
        </Button>

        <Button 
          variant="outline"
          onClick={() => setCurrentScreen('notifications')}
          className="w-full justify-start gap-2 h-10"
        >
          <Bell className="w-4 h-4" />
          Notifications
        </Button>
      </div>
    </div>
  );
}
