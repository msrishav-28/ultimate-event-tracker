import { Bell, Search, Home, Menu } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { useApp } from '../context/AppContext';
import { Badge } from './ui/badge';

interface TopBarProps {
  onMenuClick: () => void;
  showMobileMenu?: boolean;
}

export function TopBar({ onMenuClick, showMobileMenu = true }: TopBarProps) {
  const { user, events } = useApp();
  
  // Count unread notifications (mock: count upcoming events in next 3 days)
  const notificationCount = events.filter(event => {
    const eventDate = new Date(event.date);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return eventDate <= threeDaysFromNow && !event.completed;
  }).length;

  return (
    <div className="sticky top-0 z-50 border-b bg-white px-4 py-3">
      <div className="flex items-center gap-4 max-w-[1920px] mx-auto">
        {/* Mobile menu button */}
        {showMobileMenu && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" style={{ color: '#212121' }} />
          </button>
        )}

        {/* Logo and title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1976D2' }}>
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="hidden md:block text-[14px]" style={{ color: '#212121' }}>
            College Event Tracker
          </span>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#757575' }} />
            <Input
              placeholder="Search events, locations..."
              className="pl-10 h-10 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-6 h-6" style={{ color: '#424242' }} />
            {notificationCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                style={{ backgroundColor: '#E53935' }}
              >
                {notificationCount}
              </Badge>
            )}
          </button>

          {/* User avatar */}
          <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
            <AvatarFallback style={{ backgroundColor: '#1976D2', color: 'white' }}>
              {user?.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
