import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Day } from 'date-fns';
import Button from './ui/Button';
import Card from './ui/Card';

const weekStartsOn = (() => {
  try {
    const info = (new Intl.Locale(navigator.language) as unknown as { weekInfo?: { weekStartsOn: number } }).weekInfo;
    if (info?.weekStartsOn) return (info.weekStartsOn % 7) as Day;
  } catch {
    return 0 as Day;
  }
  return 0 as Day;
})();

const weekdayLabels = (() => {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return [...labels.slice(weekStartsOn), ...labels.slice(0, weekStartsOn)];
})();

interface CalendarProps {
  selectedDates: Date[];
  onToggleDate: (date: Date) => void;
}

export default function Calendar({ selectedDates, onToggleDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const lastClickedRef = useRef<Date | null>(null);
  const dragRef = useRef(false);
  const dragModeRef = useRef<'add' | 'remove' | null>(null);
  const dragStartRef = useRef<Date | null>(null);
  const movedRef = useRef(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const isSelected = (date: Date) =>
    selectedDates.some((d) => isSameDay(d, date));

  useEffect(() => {
    const handleGlobalEnd = () => {
      dragRef.current = false;
    };
    window.addEventListener('pointerup', handleGlobalEnd);
    window.addEventListener('pointercancel', handleGlobalEnd);
    return () => {
      window.removeEventListener('pointerup', handleGlobalEnd);
      window.removeEventListener('pointercancel', handleGlobalEnd);
    };
  }, []);

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = false;
    if (movedRef.current && dragStartRef.current) {
      const start = dragStartRef.current;
      const mode = dragModeRef.current;
      if (mode === 'add' && !isSelected(start)) onToggleDate(start);
      else if (mode === 'remove' && isSelected(start)) onToggleDate(start);
    }
    dragStartRef.current = null;
  };

  const handlePointerEnter = (day: Date, past: boolean) => {
    if (!dragRef.current || past) return;
    movedRef.current = true;
    const mode = dragModeRef.current;
    if (mode === 'add' && !isSelected(day)) onToggleDate(day);
    else if (mode === 'remove' && isSelected(day)) onToggleDate(day);
  };

  const handleDayClick = (e: MouseEvent<HTMLButtonElement>, day: Date) => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    if (!isSameMonth(day, currentMonth)) {
      setCurrentMonth(startOfMonth(day));
    }
    if (e.shiftKey && lastClickedRef.current) {
      const anchor = lastClickedRef.current;
      const start = anchor <= day ? anchor : day;
      const end = anchor <= day ? day : anchor;
      eachDayOfInterval({ start, end }).forEach((d) => {
        if (!isSelected(d)) onToggleDate(d);
      });
      lastClickedRef.current = day;
    } else {
      onToggleDate(day);
      lastClickedRef.current = day;
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Previous month"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="min-h-11 min-w-11 p-2 text-inherit dark:text-inherit"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </Button>
        <div className="flex flex-col items-center">
          <h3 aria-live="polite" className="font-semibold text-gray-800 dark:text-gray-100">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline hover:bg-transparent dark:hover:bg-transparent px-2 py-1 min-h-11"
          >
            Today
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Next month"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="min-h-11 min-w-11 p-2 text-inherit dark:text-inherit"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>

      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1 mb-2"
      >
        {weekdayLabels.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1"
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = isSelected(day);
          const past = day < new Date(new Date().setHours(0, 0, 0, 0));

          const stateClasses = past
            ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent'
            : selected
              ? 'bg-brand-500 text-white dark:text-white hover:bg-brand-600 dark:hover:bg-brand-600'
              : !inMonth
                ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                : 'text-gray-700 dark:text-gray-200 hover:bg-brand-100 dark:hover:bg-brand-900/50';

          return (
            <Button
              key={day.toISOString()}
              variant="ghost"
              size="sm"
              disabled={past}
              title={past ? "Past dates can't be scheduled" : undefined}
              aria-label={format(day, 'EEEE, MMMM d, yyyy')}
              aria-pressed={selected}
              style={{ touchAction: 'pan-y' }}
              onPointerDown={(e) => {
                if (e.button !== 0 || past) return;
                movedRef.current = false;
                if (e.shiftKey) return;
                dragRef.current = true;
                dragModeRef.current = selected ? 'remove' : 'add';
                dragStartRef.current = day;
                lastClickedRef.current = day;
              }}
              onPointerEnter={() => handlePointerEnter(day, past)}
              onClick={(e) => handleDayClick(e, day)}
              className={`aspect-square min-h-11 min-w-11 px-0 py-0 text-sm font-medium disabled:opacity-100 ${stateClasses} ${
                today && !selected ? 'ring-2 ring-brand-300 dark:ring-brand-700' : ''
              }`}
            >
              {format(day, 'd')}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
