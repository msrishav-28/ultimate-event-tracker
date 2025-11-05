import { useState } from 'react';
import { X, Share2, Users, Link, Mail, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Event } from '../types';
import { toast } from 'sonner@2.0.3';

interface ShareEventModalProps {
  open: boolean;
  onClose: () => void;
  event: Event;
}

export function ShareEventModal({ open, onClose, event }: ShareEventModalProps) {
  const [shareMethod, setShareMethod] = useState<'link' | 'email' | 'social'>('link');
  const [permissions, setPermissions] = useState<'view' | 'edit'>('view');
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const shareUrl = `${window.location.origin}/shared-event/${event.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleShareByEmail = async () => {
    if (!recipients.trim()) {
      toast.error('Please enter recipient email addresses');
      return;
    }

    setIsSharing(true);
    try {
      // Mock email sharing - in real implementation, this would call an API
      const subject = `Check out this event: ${event.title}`;
      const body = `${message || 'I thought you might be interested in this event!'}\n\n${event.title}\n${new Date(event.date).toLocaleDateString()} at ${event.time}\n${event.location ? `Location: ${event.location}\n` : ''}${event.description ? `\n${event.description}\n` : ''}\nView details: ${shareUrl}`;

      const mailtoLink = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;

      toast.success('Email client opened with event details');
      onClose();
    } catch (error) {
      toast.error('Failed to share via email');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSocialShare = async (platform: string) => {
    const text = `Check out this event: ${event.title} - ${new Date(event.date).toLocaleDateString()} at ${event.time}`;
    const url = shareUrl;

    let shareUrl = '';

    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
    toast.success(`Shared to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Preview */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-sm">{event.title}</h3>
            <p className="text-xs text-gray-600">
              {new Date(event.date).toLocaleDateString()} at {event.time}
            </p>
            {event.location && (
              <p className="text-xs text-gray-600">📍 {event.location}</p>
            )}
          </div>

          {/* Share Method Selection */}
          <div className="space-y-3">
            <Label>Share via:</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={shareMethod === 'link' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShareMethod('link')}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <Link className="w-4 h-4" />
                <span className="text-xs">Link</span>
              </Button>
              <Button
                variant={shareMethod === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShareMethod('email')}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <Mail className="w-4 h-4" />
                <span className="text-xs">Email</span>
              </Button>
              <Button
                variant={shareMethod === 'social' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShareMethod('social')}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-xs">Social</span>
              </Button>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <Label>Permissions:</Label>
            <Select value={permissions} onValueChange={(value: 'view' | 'edit') => setPermissions(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View Only</SelectItem>
                <SelectItem value="edit">Can Edit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Share Method Content */}
          {shareMethod === 'link' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Share Link:</Label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="flex-1" />
                  <Button onClick={handleCopyLink} variant="outline">
                    Copy
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                Anyone with this link can {permissions === 'view' ? 'view' : 'edit'} this event
              </div>
            </div>
          )}

          {shareMethod === 'email' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="recipients">Email addresses (comma-separated):</Label>
                <Input
                  id="recipients"
                  placeholder="friend1@email.com, friend2@email.com"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Personal message (optional):</Label>
                <Textarea
                  id="message"
                  placeholder="Hey, I thought you might be interested in this event..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                onClick={handleShareByEmail}
                disabled={isSharing}
                className="w-full"
              >
                {isSharing ? 'Opening Email...' : 'Share via Email'}
              </Button>
            </div>
          )}

          {shareMethod === 'social' && (
            <div className="space-y-3">
              <Label>Share on social media:</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSocialShare('whatsapp')}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSocialShare('telegram')}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Telegram
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSocialShare('twitter')}
                  className="flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSocialShare('facebook')}
                  className="flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Facebook
                </Button>
              </div>
            </div>
          )}

          {/* Share Statistics (Mock) */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Event shared 0 times</span>
              <span>0 views</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
