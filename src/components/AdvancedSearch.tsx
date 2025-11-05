import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Calendar, MapPin, User, Tag, X, Clock, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { useApp } from '../context/AppContext';
import { Event } from '../types';

interface SearchResult extends Event {
  relevanceScore: number;
  highlights: string[];
  matchType: 'exact' | 'good' | 'partial';
}

interface SearchFilters {
  category: string;
  dateFrom: string;
  dateTo: string;
  location: string;
  organizer: string;
  tags: string;
  minPriority: string;
  maxPriority: string;
  hasPrepTasks: boolean;
  isPrepEvent: string;
}

export function AdvancedSearch() {
  const { events } = useApp();

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<any>({});
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<SearchFilters>({
    category: 'all',
    dateFrom: '',
    dateTo: '',
    location: '',
    organizer: '',
    tags: '',
    minPriority: '',
    maxPriority: '',
    hasPrepTasks: false,
    isPrepEvent: 'all'
  });

  // Search suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions({});
      return;
    }

    try {
      const response = await fetch(`/api/events/search?q=${encodeURIComponent(searchQuery)}&suggest=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || {});
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        fetchSuggestions(query);
      } else {
        setSuggestions({});
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  // Execute search
  const performSearch = async () => {
    if (!query.trim() && !hasActiveFilters()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (query.trim()) params.append('search', query.trim());
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.location) params.append('location', filters.location);
      if (filters.organizer) params.append('organizer', filters.organizer);
      if (filters.tags) params.append('tags', filters.tags);
      if (filters.minPriority) params.append('minPriority', filters.minPriority);
      if (filters.maxPriority) params.append('maxPriority', filters.maxPriority);
      if (filters.hasPrepTasks) params.append('hasPrepTasks', 'true');
      if (filters.isPrepEvent !== 'all') params.append('isPrepEvent', filters.isPrepEvent);

      params.append('limit', '50');

      const response = await fetch(`/api/events?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.events || []);
      } else {
        console.error('Search failed:', response.status);
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return filters.category !== 'all' ||
           filters.dateFrom ||
           filters.dateTo ||
           filters.location ||
           filters.organizer ||
           filters.tags ||
           filters.minPriority ||
           filters.maxPriority ||
           filters.hasPrepTasks ||
           filters.isPrepEvent !== 'all';
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      category: 'all',
      dateFrom: '',
      dateTo: '',
      location: '',
      organizer: '',
      tags: '',
      minPriority: '',
      maxPriority: '',
      hasPrepTasks: false,
      isPrepEvent: 'all'
    });
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string, type: string) => {
    if (type === 'titles') {
      setQuery(suggestion);
    } else if (type === 'locations') {
      setFilters(prev => ({ ...prev, location: suggestion }));
    } else if (type === 'organizers') {
      setFilters(prev => ({ ...prev, organizer: suggestion }));
    }
    setSuggestions({});
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  // Get match type color
  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'bg-green-100 border-green-300';
      case 'good': return 'bg-blue-100 border-blue-300';
      case 'partial': return 'bg-yellow-100 border-yellow-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Search Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Advanced Event Search</h1>
        <p className="text-gray-600">Find events using powerful search and filtering options</p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search events by title, description, location, organizer, or tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && performSearch()}
            className="pl-10 pr-20 h-12 text-lg"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-8"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>
            <Button onClick={performSearch} disabled={isSearching} className="h-8">
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Search Suggestions */}
        {(suggestions.titles?.length > 0 || suggestions.locations?.length > 0 || suggestions.organizers?.length > 0) && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10 max-h-64 overflow-y-auto">
            {suggestions.titles?.length > 0 && (
              <div className="p-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Event Titles</div>
                {suggestions.titles.slice(0, 5).map((title: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(title, 'titles')}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    {title}
                  </button>
                ))}
              </div>
            )}

            {(suggestions.locations?.length > 0 || suggestions.organizers?.length > 0) && (
              <Separator />
            )}

            <div className="p-3 flex gap-4">
              {suggestions.locations?.length > 0 && (
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 mb-2">Locations</div>
                  {suggestions.locations.slice(0, 3).map((location: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(location, 'locations')}
                      className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
                    >
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {location}
                    </button>
                  ))}
                </div>
              )}

              {suggestions.organizers?.length > 0 && (
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 mb-2">Organizers</div>
                  {suggestions.organizers.slice(0, 3).map((organizer: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(organizer, 'organizers')}
                      className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
                    >
                      <User className="w-3 h-3 inline mr-1" />
                      {organizer}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Advanced Filters
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </CardTitle>
            <CardDescription>
              Refine your search with specific criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="competition">Competition</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium mb-2">Date From</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date To</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input
                  placeholder="e.g., CS Building"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              {/* Organizer */}
              <div>
                <label className="block text-sm font-medium mb-2">Organizer</label>
                <Input
                  placeholder="e.g., ACM Club"
                  value={filters.organizer}
                  onChange={(e) => setFilters(prev => ({ ...prev, organizer: e.target.value }))}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <Input
                  placeholder="e.g., programming, competition"
                  value={filters.tags}
                  onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>

              {/* Priority Range */}
              <div>
                <label className="block text-sm font-medium mb-2">Min Priority</label>
                <Select value={filters.minPriority} onValueChange={(value) => setFilters(prev => ({ ...prev, minPriority: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="3">Medium</SelectItem>
                    <SelectItem value="4">High</SelectItem>
                    <SelectItem value="5">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Priority</label>
                <Select value={filters.maxPriority} onValueChange={(value) => setFilters(prev => ({ ...prev, maxPriority: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="3">Medium</SelectItem>
                    <SelectItem value="4">High</SelectItem>
                    <SelectItem value="5">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Event Type</label>
                <Select value={filters.isPrepEvent} onValueChange={(value) => setFilters(prev => ({ ...prev, isPrepEvent: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="false">Main Events</SelectItem>
                    <SelectItem value="true">Preparation Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prep Tasks */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasPrepTasks"
                  checked={filters.hasPrepTasks}
                  onChange={(e) => setFilters(prev => ({ ...prev, hasPrepTasks: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="hasPrepTasks" className="text-sm font-medium">
                  Has Preparation Tasks
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Search Results ({results.length} found)
            </h2>
            <Badge variant="secondary">
              {hasActiveFilters() ? 'Filtered' : 'All Events'}
            </Badge>
          </div>

          <div className="grid gap-4">
            {results.map((result, index) => (
              <Card key={result.id} className={`${getMatchTypeColor(result.matchType)} border-2`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{result.title}</h3>
                        <Badge className={getPriorityColor(result.priority)}>
                          {result.priority}
                        </Badge>
                        <Badge variant="outline">{result.category}</Badge>
                        <Badge variant="secondary" className="text-xs">
                          {result.matchType} match
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(result.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {result.time}
                        </div>
                        {result.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {result.location}
                          </div>
                        )}
                      </div>

                      {/* Highlights */}
                      {result.highlights && result.highlights.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-700 mb-1">Matches:</div>
                          <div className="flex flex-wrap gap-2">
                            {result.highlights.map((highlight, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {highlight}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.description && (
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {result.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right ml-4">
                      <div className="text-sm text-gray-500 mb-2">
                        Relevance: {result.relevanceScore}
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {results.length === 0 && !isSearching && (query.trim() || hasActiveFilters()) && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search terms or filters
          </p>
          <Button variant="outline" onClick={() => { setQuery(''); clearFilters(); }}>
            Clear Search
          </Button>
        </div>
      )}
    </div>
  );
}
