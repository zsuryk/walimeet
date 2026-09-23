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
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="min-h-11 min-w-11 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="flex flex-col items-center">
          <h3 aria-live="polite" className="font-semibold text-gray-800 dark:text-gray-100">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 min-h-11"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="min-h-11 min-w-11 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
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

          return (
            <button
              key={day.toISOString()}
              type="button"
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
              className={`
                aspect-square min-h-11 min-w-11 rounded-lg text-sm font-medium transition-colors
                ${!inMonth && !selected ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                ${past ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : ''}
                ${!past && inMonth && !selected ? 'hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-gray-700 dark:text-gray-200' : ''}
                ${selected ? 'bg-indigo-500 text-white hover:bg-indigo-600' : ''}
                ${today && !selected ? 'ring-2 ring-indigo-300 dark:ring-indigo-700' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
