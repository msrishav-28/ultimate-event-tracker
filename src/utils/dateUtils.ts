export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if same day
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }

  // Check if tomorrow
  if (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  ) {
    return 'Tomorrow';
  }

  // Calculate days difference
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && diffDays < 7) {
    return `in ${diffDays} days`;
  }

  if (diffDays < 0 && diffDays > -7) {
    return `${Math.abs(diffDays)} days ago`;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string, timeString: string): string {
  const date = new Date(dateString);
  const dateFormatted = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format time
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${dateFormatted} at ${hour12}:${minutes} ${ampm}`;
}

export function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isPastEvent(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date < today;
}

export function scheduleReminders(eventDate: string, eventTime: string) {
  const eventDateTime = new Date(`${eventDate}T${eventTime}`);
  
  const reminders = {
    oneWeek: new Date(eventDateTime.getTime() - 7 * 24 * 60 * 60 * 1000),
    threeDays: new Date(eventDateTime.getTime() - 3 * 24 * 60 * 60 * 1000),
    oneDay: new Date(eventDateTime.getTime() - 24 * 60 * 60 * 1000),
    twoHours: new Date(eventDateTime.getTime() - 2 * 60 * 60 * 1000),
  };

  return reminders;
}
