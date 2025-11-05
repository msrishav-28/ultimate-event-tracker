import { useState } from 'react';
import { Search, UserPlus, Trophy, Users as UsersIcon, Calendar } from 'lucide-react';
import { TopBar } from './TopBar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { useApp } from '../context/AppContext';

export function FriendsScreen() {
  const { friends, events, setCurrentScreen, studyGroups } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock friends' events data
  const friendsEvents = [
    {
      friend: friends[1], // Sarah Khan
      event: events[1], // ACM CodeChef
    },
    {
      friend: friends[2], // Priya Sharma
      event: events[0], // ML Workshop
    },
  ];

  // Mock leaderboard data
  const leaderboard = [
    { rank: 1, user: friends[0], score: 12, category: 'Competitions' },
    { rank: 2, user: friends[1], score: 10, category: 'Competitions' },
    { rank: 47, user: { id: 'current', name: 'You', email: '', year: 'Senior', department: 'CS' }, score: 3, category: 'Competitions' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setCurrentScreen('dashboard')} />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentScreen('dashboard')}
            >
              ← Back to Dashboard
            </Button>
            <h1 className="text-[20px]" style={{ color: '#212121' }}>Friends & Social</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Friends List */}
          <div className="bg-white rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px]" style={{ color: '#212121' }}>Friends</h2>
              <Button size="sm" variant="outline" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Friend
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#757575' }} />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Friends list */}
            <div className="space-y-2">
              {filteredFriends.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback style={{ backgroundColor: '#1976D2', color: 'white' }}>
                      {friend.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] truncate" style={{ color: '#212121' }}>
                      {friend.name}
                    </p>
                    <p className="text-[12px]" style={{ color: friend.online ? '#43A047' : '#757575' }}>
                      {friend.online ? '● Online' : `Last seen ${friend.lastSeen}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="events" className="space-y-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="events" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Friends' Events
                </TabsTrigger>
                <TabsTrigger value="groups" className="gap-2">
                  <UsersIcon className="w-4 h-4" />
                  Study Groups
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="gap-2">
                  <Trophy className="w-4 h-4" />
                  Leaderboard
                </TabsTrigger>
              </TabsList>

              {/* Friends' Events Tab */}
              <TabsContent value="events" className="space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-[14px] mb-4" style={{ color: '#212121' }}>
                    What your friends are attending (Next 7 Days)
                  </h3>

                  <div className="space-y-4">
                    {friendsEvents.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback style={{ backgroundColor: '#1976D2', color: 'white' }}>
                              {item.friend.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-[14px]" style={{ color: '#424242' }}>
                            <span style={{ color: '#212121' }}>{item.friend.name}</span> is attending:
                          </p>
                        </div>

                        <div className="pl-10 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-[14px]" style={{ color: '#212121' }}>
                                {item.event.title}
                              </p>
                              <p className="text-[12px]" style={{ color: '#757575' }}>
                                {new Date(item.event.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })} at {item.event.time}
                              </p>
                            </div>
                            <Badge
                              style={{
                                backgroundColor: item.event.priority === 'critical' ? '#E53935' : '#FB8C00',
                                color: 'white'
                              }}
                            >
                              {item.event.priority.toUpperCase()}
                            </Badge>
                          </div>

                          {/* Check if current user has same event */}
                          {index === 1 && (
                            <div className="p-2 rounded" style={{ backgroundColor: '#FFF9C4' }}>
                              <p className="text-[12px]" style={{ color: '#F57F17' }}>
                                🟡 You're attending this too!
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              Join Study Group
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
                              Add to Calendar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {friendsEvents.length === 0 && (
                      <p className="text-center text-[14px] py-8" style={{ color: '#757575' }}>
                        No upcoming events from friends
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Study Groups Tab */}
              <TabsContent value="groups" className="space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-[14px] mb-4" style={{ color: '#212121' }}>
                    Active Study Groups
                  </h3>

                  <div className="space-y-4">
                    {studyGroups.map(group => (
                      <div key={group.id} className="p-4 border rounded-lg space-y-3">
                        <div>
                          <h4 className="text-[14px] mb-1" style={{ color: '#212121' }}>
                            {group.eventName} - Study Group
                          </h4>
                          <p className="text-[12px]" style={{ color: '#757575' }}>
                            {group.members} members
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-[12px]" style={{ color: '#424242' }}>
                          <Calendar className="w-4 h-4" style={{ color: '#757575' }} />
                          <span>Meeting: {group.meetingTime}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[12px]" style={{ color: '#424242' }}>
                          <span>📍 {group.meetingLocation}</span>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" style={{ backgroundColor: '#1976D2' }}>
                            Join Group
                          </Button>
                          <Button size="sm" variant="outline">
                            Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Leaderboard Tab */}
              <TabsContent value="leaderboard" className="space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[14px]" style={{ color: '#212121' }}>
                      Leaderboard
                    </h3>
                    <div className="flex gap-2">
                      <select className="text-[12px] border rounded px-2 py-1">
                        <option>Competition</option>
                        <option>All Categories</option>
                        <option>Workshops</option>
                        <option>Webinars</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {leaderboard.map(entry => (
                      <div
                        key={entry.rank}
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          entry.rank === 47 ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-12 text-center">
                          {entry.rank === 1 && <span className="text-[20px]">🥇</span>}
                          {entry.rank === 2 && <span className="text-[20px]">🥈</span>}
                          {entry.rank > 2 && (
                            <span className="text-[14px]" style={{ color: '#757575' }}>
                              #{entry.rank}
                            </span>
                          )}
                        </div>

                        <Avatar className="w-10 h-10">
                          <AvatarFallback style={{ backgroundColor: entry.rank === 47 ? '#1976D2' : '#757575', color: 'white' }}>
                            {entry.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <p className="text-[14px]" style={{ color: '#212121' }}>
                            {entry.user.name}
                          </p>
                          <p className="text-[12px]" style={{ color: '#757575' }}>
                            {entry.score} competitions attended
                          </p>
                        </div>

                        {entry.rank === 47 && (
                          <Badge variant="secondary">You</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Rank up message */}
                  <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#E3F2FD' }}>
                    <p className="text-[12px]" style={{ color: '#1565C0' }}>
                      💪 Earn 5 more to rank up!
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
