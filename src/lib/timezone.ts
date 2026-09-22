export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatTimeInTimezone(
  date: Date,
  timezone: string,
  format: '12h' | '24h' = '24h'
): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    hour12: format === '12h',
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function formatDateInTimezone(
  date: Date,
  timezone: string
): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function getTimezoneOffset(timezone: string): string {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const diffMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;
  const sign = diffMinutes >= 0 ? '+' : '-';
  const absDiff = Math.abs(diffMinutes);
  const hours = Math.floor(absDiff / 60);
  const minutes = absDiff % 60;
  if (minutes === 0) {
    return `(UTC${sign}${hours})`;
  }
  return `(UTC${sign}${hours}:${String(minutes).padStart(2, '0')})`;
}

export function generateTimeSlots(
  start: string,
  end: string,
  slotMinutes: number
): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    currentMinutes += slotMinutes;
  }

  return slots;
}
