import { useState, useRef } from 'react';
import { X, Type, Mic, Image as ImageIcon, Mail, ChevronLeft, Upload, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Switch } from './ui/switch';
import { Event, Priority, Category } from '../types';
import { toast } from 'sonner@2.0.3';
import { useApp } from '../context/AppContext';

interface AddEventModalProps {
  open: boolean;
  onClose: () => void;
}

type InputMethod = 'text' | 'voice' | 'image' | 'email' | null;
type Step = 'method' | 'input' | 'review' | 'reminders';

export function AddEventModal({ open, onClose }: AddEventModalProps) {
  const { processText, processVoice, processImage, addEvent, isLoading } = useApp();
  const [step, setStep] = useState<Step>('method');
  const [inputMethod, setInputMethod] = useState<InputMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [eventData, setEventData] = useState<Partial<Event>>({
    title: '',
    date: '',
    time: '',
    location: '',
    category: 'workshop',
    priority: 'medium',
    description: '',
    prepProgress: 0,
    reminders: {
      oneWeek: true,
      threeDays: true,
      oneDay: true,
      twoHours: true,
    },
    addToCalendar: true,
    postToFriends: false,
  });

  const handleMethodSelect = (method: InputMethod) => {
    setInputMethod(method);
    if (method === 'email') {
      toast.info('Forward emails to: events@collegetracker.app');
      return;
    }
    setStep('input');
  };

  const handleTextInput = async (text: string) => {
    if (!text.trim()) {
      toast.error('Please enter some text to process');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processText(text);

      // Transform API result to frontend format
      const extracted = {
        title: result.title || 'Untitled Event',
        date: result.dateTime ? new Date(result.dateTime).toISOString().split('T')[0] : '',
        time: result.dateTime ? new Date(result.dateTime).toTimeString().split(' ')[0].substring(0, 5) : '',
        location: result.location || '',
        category: (result.category as Category) || 'workshop',
        priority: result.priority === 5 ? 'critical' :
                 result.priority === 4 ? 'high' :
                 result.priority === 3 ? 'medium' : 'low',
        description: result.description || text,
        source: 'text' as const,
        confidence: result.extractionConfidence || 0.8,
      };

      setEventData({ ...eventData, ...extracted });
      setIsProcessing(false);
      setStep('review');
      toast.success('Event details extracted successfully!');
    } catch (error) {
      console.error('Text processing error:', error);
      setIsProcessing(false);
      toast.error('Failed to process text. Please try again.');
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');
      setTranscript(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Error occurred during speech recognition');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();

    // Store recognition instance to stop it later
    (window as any).currentRecognition = recognition;
  };

  const stopVoiceInput = () => {
    if ((window as any).currentRecognition) {
      (window as any).currentRecognition.stop();
    }
    setIsListening(false);
  };

  const confirmVoiceTranscript = async () => {
    if (!transcript.trim()) {
      toast.error('No speech detected. Please try again.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processVoice(transcript);

      // Transform API result to frontend format
      const extracted = {
        title: result.title || 'Untitled Event',
        date: result.dateTime ? new Date(result.dateTime).toISOString().split('T')[0] : '',
        time: result.dateTime ? new Date(result.dateTime).toTimeString().split(' ')[0].substring(0, 5) : '',
        location: result.location || '',
        category: (result.category as Category) || 'workshop',
        priority: result.priority === 5 ? 'critical' :
                 result.priority === 4 ? 'high' :
                 result.priority === 3 ? 'medium' : 'low',
        description: result.description || transcript,
        source: 'voice' as const,
        confidence: result.extractionConfidence || 0.8,
      };

      setEventData({ ...eventData, ...extracted });
      setIsProcessing(false);
      setStep('review');
      toast.success('Voice input processed successfully!');
    } catch (error) {
      console.error('Voice processing error:', error);
      setIsProcessing(false);
      toast.error('Failed to process voice input. Please try again.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    // Check file type
    const isPDF = file.type === 'application/pdf';
    
    // Show file preview (image only, PDFs show filename)
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!isPDF) {
        setUploadedImage(e.target?.result as string);
      }
      setIsProcessing(true);

      try {
        const result = await processImage(file);

        // Transform API result to frontend format
        const extracted = {
          title: result.title || 'Untitled Event',
          date: result.dateTime ? new Date(result.dateTime).toISOString().split('T')[0] : '',
          time: result.dateTime ? new Date(result.dateTime).toTimeString().split(' ')[0].substring(0, 5) : '',
          location: result.location || '',
          category: (result.category as Category) || 'competition',
          priority: result.priority === 5 ? 'critical' :
                   result.priority === 4 ? 'high' :
                   result.priority === 3 ? 'medium' : 'low',
          description: result.description || (isPDF ? 'Event extracted from PDF' : 'Event extracted from poster'),
          source: 'image' as const,
          confidence: result.extractionConfidence || 0.8,
        };

        setEventData({ ...eventData, ...extracted });
        setIsProcessing(false);
        setStep('review');
        toast.success(`Event details extracted from ${isPDF ? 'PDF' : 'image'}!`);
      } catch (error) {
        console.error('File processing error:', error);
        setIsProcessing(false);
        toast.error(`Failed to process ${isPDF ? 'PDF' : 'image'}. Please try again.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!eventData.title || !eventData.date || !eventData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await addEvent(eventData);
      toast.success('✓ Event created! Reminders scheduled.');
      handleClose();
    } catch (error) {
      console.error('Save event error:', error);
      toast.error('Failed to create event. Please try again.');
    }
  };

  const handleClose = () => {
    setStep('method');
    setInputMethod(null);
    setTranscript('');
    setUploadedImage(null);
    setEventData({
      title: '',
      date: '',
      time: '',
      location: '',
      category: 'workshop',
      priority: 'medium',
      description: '',
      prepProgress: 0,
      reminders: {
        oneWeek: true,
        threeDays: true,
        oneDay: true,
        twoHours: true,
      },
      addToCalendar: true,
      postToFriends: false,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step !== 'method' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (step === 'input') setStep('method');
                    else if (step === 'review') setStep('input');
                    else if (step === 'reminders') setStep('review');
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <DialogTitle className="text-[20px]">Add New Event</DialogTitle>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Step 1: Method Selection */}
        {step === 'method' && (
          <div className="space-y-4 py-6">
            <p className="text-[14px]" style={{ color: '#757575' }}>
              Choose how you'd like to add your event:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleMethodSelect('text')}
                className="p-6 border-2 rounded-lg hover:border-blue-500 transition-all hover:shadow-md text-left space-y-2"
              >
                <Type className="w-8 h-8" style={{ color: '#1976D2' }} />
                <h3 className="text-[14px]" style={{ color: '#212121' }}>Type it</h3>
                <p className="text-[12px]" style={{ color: '#757575' }}>
                  Enter event details in natural language
                </p>
              </button>

              <button
                onClick={() => handleMethodSelect('voice')}
                className="p-6 border-2 rounded-lg hover:border-blue-500 transition-all hover:shadow-md text-left space-y-2"
              >
                <Mic className="w-8 h-8" style={{ color: '#1976D2' }} />
                <h3 className="text-[14px]" style={{ color: '#212121' }}>Say it</h3>
                <p className="text-[12px]" style={{ color: '#757575' }}>
                  Use voice input to describe the event
                </p>
              </button>

              <button
                onClick={() => handleMethodSelect('image')}
                className="p-6 border-2 rounded-lg hover:border-blue-500 transition-all hover:shadow-md text-left space-y-2"
              >
                <ImageIcon className="w-8 h-8" style={{ color: '#1976D2' }} />
                <h3 className="text-[14px]" style={{ color: '#212121' }}>Upload Poster/PDF</h3>
                <p className="text-[12px]" style={{ color: '#757575' }}>
                  Extract details from poster or document
                </p>
              </button>

              <button
                onClick={() => handleMethodSelect('email')}
                className="p-6 border-2 rounded-lg hover:border-blue-500 transition-all hover:shadow-md text-left space-y-2"
              >
                <Mail className="w-8 h-8" style={{ color: '#1976D2' }} />
                <h3 className="text-[14px]" style={{ color: '#212121' }}>Forward Email</h3>
                <p className="text-[12px]" style={{ color: '#757575' }}>
                  Get your email forwarding address
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step 2A: Text Input */}
        {step === 'input' && inputMethod === 'text' && (
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label>Describe your event</Label>
              <Textarea
                placeholder="I have ML workshop in CS building Friday at 5 PM, it's important"
                rows={6}
                className="resize-none"
                onChange={(e) => setTranscript(e.target.value)}
              />
              <p className="text-[12px]" style={{ color: '#757575' }}>
                Pro tip: Be conversational! Include event name, time, location, and importance
              </p>
            </div>

            <Button
              onClick={() => handleTextInput(transcript)}
              disabled={!transcript || isProcessing}
              className="w-full"
              style={{ backgroundColor: '#1976D2' }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting details...
                </>
              ) : (
                'Parse Event'
              )}
            </Button>
          </div>
        )}

        {/* Step 2B: Voice Input */}
        {step === 'input' && inputMethod === 'voice' && (
          <div className="space-y-6 py-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isListening ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: isListening ? '#E53935' : '#1976D2' }}
              >
                <Mic className="w-12 h-12 text-white" />
              </div>
              <p className="text-[14px]" style={{ color: isListening ? '#E53935' : '#757575' }}>
                {isListening ? 'Listening...' : 'Click the button to start'}
              </p>
            </div>

            {transcript && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-[12px] mb-1" style={{ color: '#757575' }}>Transcript:</p>
                <p className="text-[14px]" style={{ color: '#424242' }}>{transcript}</p>
              </div>
            )}

            <div className="flex gap-2">
              {!isListening ? (
                <Button
                  onClick={handleVoiceInput}
                  className="flex-1"
                  style={{ backgroundColor: '#1976D2' }}
                >
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopVoiceInput}
                  className="flex-1"
                  variant="destructive"
                >
                  Stop
                </Button>
              )}
              {transcript && !isListening && (
                <Button onClick={confirmVoiceTranscript} className="flex-1">
                  Confirm
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 2C: Image Upload */}
        {step === 'input' && inputMethod === 'image' && (
          <div className="space-y-4 py-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleImageUpload}
            />
            
            {!uploadedImage ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-lg p-12 hover:border-blue-500 transition-all text-center space-y-4"
              >
                <Upload className="w-12 h-12 mx-auto" style={{ color: '#1976D2' }} />
                <div>
                  <p className="text-[14px]" style={{ color: '#212121' }}>
                    Drag poster/document here or click to upload
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: '#757575' }}>
                    Images (JPEG, PNG, WebP) or PDF (max 20MB)
                  </p>
                </div>
              </button>
            ) : (
              <div className="space-y-4">
                <img src={uploadedImage} alt="Uploaded poster" className="w-full rounded-lg" />
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#1976D2' }} />
                    <p className="text-[14px]" style={{ color: '#757575' }}>
                      Extracting event details from image...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review & Edit */}
        {step === 'review' && (
          <div className="space-y-4 py-6">
            {eventData.confidence && eventData.confidence < 80 && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFF3E0' }}>
                <p className="text-[12px]" style={{ color: '#E65100' }}>
                  ⚠️ Manual review needed - Extracted with {eventData.confidence}% confidence
                </p>
              </div>
            )}

            {eventData.confidence && eventData.confidence >= 80 && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                <p className="text-[12px]" style={{ color: '#2E7D32' }}>
                  ✓ Extracted with {eventData.confidence}% confidence
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={eventData.title}
                  onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                  placeholder="Event name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={eventData.category}
                  onValueChange={(value) => setEventData({ ...eventData, category: value as Category })}
                >
                  <SelectTrigger id="category">
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
                  onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={eventData.time}
                  onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={eventData.location}
                onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                placeholder="Building name, room number, or online link"
              />
            </div>

            <div className="space-y-2">
              <Label>Priority *</Label>
              <RadioGroup
                value={eventData.priority}
                onValueChange={(value) => setEventData({ ...eventData, priority: value as Priority })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="low" />
                  <Label htmlFor="low" className="cursor-pointer">Low</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="cursor-pointer">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="high" />
                  <Label htmlFor="high" className="cursor-pointer">High</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="critical" id="critical" />
                  <Label htmlFor="critical" className="cursor-pointer">Critical</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                rows={4}
                placeholder="Additional details about the event"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setStep('reminders')}
                className="flex-1"
                style={{ backgroundColor: '#1976D2' }}
              >
                Next: Set Reminders
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Reminders */}
        {step === 'reminders' && (
          <div className="space-y-6 py-6">
            <div className="space-y-4">
              <h3 className="text-[14px]" style={{ color: '#212121' }}>Reminder Schedule</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="oneWeek" className="cursor-pointer">1 Week Before</Label>
                  <Switch
                    id="oneWeek"
                    checked={eventData.reminders?.oneWeek}
                    onCheckedChange={(checked) =>
                      setEventData({
                        ...eventData,
                        reminders: { ...eventData.reminders!, oneWeek: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="threeDays" className="cursor-pointer">3 Days Before</Label>
                  <Switch
                    id="threeDays"
                    checked={eventData.reminders?.threeDays}
                    onCheckedChange={(checked) =>
                      setEventData({
                        ...eventData,
                        reminders: { ...eventData.reminders!, threeDays: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="oneDay" className="cursor-pointer">1 Day Before</Label>
                  <Switch
                    id="oneDay"
                    checked={eventData.reminders?.oneDay}
                    onCheckedChange={(checked) =>
                      setEventData({
                        ...eventData,
                        reminders: { ...eventData.reminders!, oneDay: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="twoHours" className="cursor-pointer">2 Hours Before</Label>
                  <Switch
                    id="twoHours"
                    checked={eventData.reminders?.twoHours}
                    onCheckedChange={(checked) =>
                      setEventData({
                        ...eventData,
                        reminders: { ...eventData.reminders!, twoHours: checked },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[14px]" style={{ color: '#212121' }}>Notification Channel</h3>
              <RadioGroup defaultValue="browser" className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="browser" id="browser" />
                  <Label htmlFor="browser" className="cursor-pointer">Browser push notification</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email-notif" />
                  <Label htmlFor="email-notif" className="cursor-pointer">Email notification</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="cursor-pointer">Both</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="calendar" className="cursor-pointer">Add to Google Calendar</Label>
                <Switch
                  id="calendar"
                  checked={eventData.addToCalendar}
                  onCheckedChange={(checked) =>
                    setEventData({ ...eventData, addToCalendar: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="friends" className="cursor-pointer">Post to friends' feed</Label>
                <Switch
                  id="friends"
                  checked={eventData.postToFriends}
                  onCheckedChange={(checked) =>
                    setEventData({ ...eventData, postToFriends: checked })
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              className="w-full"
              style={{ backgroundColor: '#1976D2' }}
            >
              Create Event
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
